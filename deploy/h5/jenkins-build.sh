#!/bin/sh
# 在 App 仓库根目录执行，不在管理 Web 或 Java 仓库执行。
set -eu
cd "$(dirname "$0")/../.."
export TZ=Asia/Shanghai
: "${BUILD_NUMBER:?请在 Jenkins H5 任务中执行}"
export H5_IMAGE="cy-pregnancy-h5:$BUILD_NUMBER"
export SERVICE_NETWORK="${SERVICE_NETWORK:-cy-pregnancy-internal}"
STEP=初始化
UPDATING=0
PREVIOUS_IMAGE=''
log() { printf '[%s] [%s] %s\n' "$(date '+%F %T %z')" "$STEP" "$*"; }
on_exit() {
    result=$?
    trap - 0
    if [ "$result" -ne 0 ]; then
        log "失败：退出码 $result"
        if [ "$UPDATING" -eq 1 ]; then
            docker compose -f compose.h5.yml ps -a || true
            docker logs --tail 60 cy-pregnancy-h5 || true
            if [ -n "$PREVIOUS_IMAGE" ]; then
                log '尝试恢复上一版 H5；本次构建仍标记失败'
                H5_IMAGE="$PREVIOUS_IMAGE" docker compose -f compose.h5.yml up -d --wait --wait-timeout 90 || true
            fi
        fi
    fi
    exit "$result"
}
trap on_exit 0
trap 'exit 130' INT
trap 'exit 143' TERM

STEP='1/6 检查环境'
log "工作目录：$(pwd)；目标镜像：$H5_IMAGE"
node --version
node -e 'const [major, minor] = process.versions.node.split(".").map(Number); if (major < 22 || (major === 22 && minor < 12)) { console.error("需要 Node >=22.12"); process.exit(1); }'
npm --version
docker version
docker compose version
test -f package-lock.json
test -f Dockerfile.h5
# 同源 API 可同时适配 SSH 预览、IP 或 HTTPS 域名，避免把生产端口写进前端。
# 仅影响本次 H5 构建，不修改小程序的 VITE_API_BASE_URL 配置文件。
export VITE_API_BASE_URL=/api/v1
if docker container inspect cy-pregnancy-h5 >/dev/null 2>&1; then
    owner=$(docker inspect --format '{{index .Config.Labels "com.docker.compose.project"}}' cy-pregnancy-h5)
    if [ "$owner" != 'cy-pregnancy-h5' ]; then log '同名容器由其他方式管理，请先确认迁移'; exit 1; fi
    PREVIOUS_IMAGE=$(docker inspect --format '{{.Image}}' cy-pregnancy-h5)
fi

STEP='2/6 安装依赖与测试'
log '按锁文件安装依赖，执行纯逻辑及类型检查'
npm ci --no-audit --no-fund
npm test
npm run typecheck

STEP='3/6 构建 H5'
log '构建浏览器版本，不上传或发布微信小程序'
npm run build:h5
test -s unpackage/dist/build/h5/index.html
du -sh unpackage/dist/build/h5

STEP='4/6 构建运行镜像'
docker build --progress=plain -f Dockerfile.h5 -t "$H5_IMAGE" .
docker run --rm "$H5_IMAGE" nginx -t

STEP='5/6 更新 H5 容器'
if ! docker network inspect "$SERVICE_NETWORK" >/dev/null 2>&1; then docker network create "$SERVICE_NETWORK"; fi
docker compose -f compose.h5.yml config --quiet
UPDATING=1
docker compose -f compose.h5.yml up -d --wait --wait-timeout 90
docker exec cy-pregnancy-h5 sh -c 'wget -q -O /dev/null http://127.0.0.1:8080/healthz && wget -q -O /dev/null http://127.0.0.1:8080/'

STEP='6/6 发布结果'
docker compose -f compose.h5.yml ps
log 'H5 发布成功；服务器本机入口 http://127.0.0.1:18081'
log "端口绑定：${H5_BIND_ADDRESS:-0.0.0.0}:18081 -> 容器 8080"
log '公网绑定时访问 http://服务器公网IP:18081，需安全组和服务器防火墙放行 TCP 18081'
log '宝塔域名反向代理目标：http://127.0.0.1:18081；公网服务需满足对应备案要求'
log '微信小程序构建与审核仍是独立发布流程；H5 不提供小程序微信 code 登录'
UPDATING=0
