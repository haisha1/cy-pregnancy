// App 仓库的默认任务发布 H5；小程序仍由开发者工具另行上传。
pipeline {
    agent any
    tools { nodejs 'node22' }
    options {
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }
    triggers { githubPush() }
    stages {
        stage('测试、构建与部署 H5') {
            steps { sh 'sh deploy/h5/jenkins-build.sh' }
        }
    }
}
