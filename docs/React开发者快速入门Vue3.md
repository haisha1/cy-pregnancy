# React 开发者快速入门 Vue 3（对照速学）

> 本文档面向**有 React 经验、首次读 Vue 3 代码感到吃力**的同学，用 React 概念逐一对映 Vue 3。
> 纯讲解材料，不修改任何源码、不被代码引用、不作为后续开发约束。
> 左侧/上方为 React（函数组件 + Hooks，React 18 写法），右侧/下方为 Vue 3（`<script setup>` + Composition API）。
> 结合本项目阅读时，建议对照 `CODE-READING.md` 与真实源码。

---

## 0. 一句话建立心智模型

| | React | Vue 3 |
| --- | --- | --- |
| 更新机制 | **状态变 → 组件函数重新执行一遍 → 比对 vDOM** | **状态变 → 响应式系统精确知道谁依赖它 → 只更新用到它的地方**，组件函数不会整体重跑 |
| 状态写法 | `useState`，取值就是变量本身 | `ref` / `reactive`，**脚本里读 ref 要 `.value`** |
| 副作用 | `useEffect`（承担了很多职责） | 拆成 `watch`（副作用）、`computed`（派生值）、生命周期钩子 |
| 组件通信 | props + 回调函数 | props + `emit` 事件 |
| 双向绑定 | 自己写 `value + onChange` | `v-model` 语法糖 |
| 全局状态 | Context / Redux / Zustand | Pinia |
| 文件形态 | 一切皆 JS，JSX 写在 JS 里 | `.vue` 单文件组件：`<template>` + `<script setup>` + `<style>` |

**最关键的差异**：React 是「**pull**（重新渲染时重新读状态）」，Vue 是「**push**（状态改了主动通知依赖）」。所以 React 里要用 `useMemo`/`useCallback` 防止重复计算和子组件无效渲染，而 Vue 的 `computed` 自动缓存、默认就很高效，不需要 `useCallback`。

---

## 1. 组件文件长什么样

**React**：逻辑和 UI 都在一个 JS 函数里，用 JSX。

```jsx
// Counter.jsx
import { useState } from "react";
export default function Counter() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <button onClick={() => setCount(count + 1)}>+1</button>
      <p>当前：{count}</p>
    </div>
  );
}
```

**Vue 3**：`.vue` 单文件组件分三块，模板是**声明式 HTML 指令**，不是 JSX。

```vue
<!-- Counter.vue -->
<script setup lang="ts">
import { ref } from "vue";
const count = ref(0); // 定义
// 脚本里改值必须 .value
function inc() {
  count.value++;
}
</script>

<template>
  <div>
    <button @click="inc">+1</button>
    <p>当前：{{ count }}</p>
    <!-- 模板里 ref 自动解包，不用 .value -->
  </div>
</template>

<style scoped>
/* scoped = 样式只作用于本组件，相当于自带 CSS Modules 作用域 */
</style>
```

对照理解：

- `<script setup>` 顶层声明的变量/函数，**直接能在模板用**，不用 return。
- `{{ }}` 相当于 JSX 的 `{ }`；`@click` 是 `v-on:click` 简写，相当于 `onClick`。
- `<template>` 里用的是 HTML 标签；本项目 uni-app 用 `view`/`text`/`input` 代替 `div`/`span`/原生输入。

---

## 2. 状态：useState ↔ ref / reactive

### 2.1 单一值：`useState` ↔ `ref`

```jsx
// React
const [name, setName] = useState("");
setName("春雨");
console.log(name);
```

```ts
// Vue
const name = ref("");
name.value = "春雨"; // 脚本里一律 .value
console.log(name.value);
```

区别：React 必须用 `setXxx` 替换；Vue 直接改 `.value`。**模板里**写 `{{ name }}` 会自动解包。

### 2.2 一组相关字段：多个 useState / 对象 useState ↔ `reactive`

```jsx
// React
const [form, setForm] = useState({ weeks: 12, days: 3 });
setForm({ ...form, days: 4 }); // 必须展开/替换
```

```ts
// Vue：reactive 对象直接改属性，无需展开
const form = reactive({ weeks: 12, days: 3 });
form.days = 4;
```

> 经验法则：**基本类型用 `ref`，表单/对象整体用 `reactive`**。本项目大量用 `ref`。
> 注意：`reactive` 不能整体替换（`form = newObj` 会丢失响应式），要逐属性改或用 `Object.assign(form, newObj)`。

### 2.3 为什么脚本里总有 `.value`（React 转 Vue 最容易懵的点）

`ref` 返回的是一个「包装对象」`{ value: T }`，只有通过 `.value` 读写才能被追踪。模板编译器会自动帮你解包，所以：

- 脚本：`count.value`
- 模板：`{{ count }}`、`:disabled="count > 0"`
- 从 Pinia store 拿状态时，store 已自动解包，写 `profile.basis` 而不是 `profile.basis.value`。

---

## 3. 派生值：useMemo ↔ computed

```jsx
// React：需要手动 useMemo 缓存，依赖数组要自己写
const totalDays = useMemo(() => weeks * 7 + days, [weeks, days]);
```

```ts
// Vue：依赖自动追踪，自动缓存，不用写依赖数组
const totalDays = computed(() => weeks.value * 7 + form.days);
// 读取：totalDays.value
```

- `computed` 是**只读派生值**，必须有返回值，等价于 `useMemo`，但依赖自动收集、绝不漏写。
- 不要在 `computed` 里发请求/弹窗/写存储（副作用），那是 `watch` 的活，和 React 里不要在 render/useMemo 里做副作用同理。

---

## 4. 副作用：useEffect ↔ watch / watchEffect

React 的 `useEffect` 一个 API 承担了「挂载后执行 + 依赖变化重跑 + 清理」。Vue 把它拆开：

### 4.1 watch：明确监听某个状态（最接近 useEffect 的依赖回调）

```jsx
// React
useEffect(() => {
  document.title = `第${weeks}周`;
}, [weeks]);
```

```ts
// Vue
watch(weeks, (newVal, oldVal) => {
  document.title = `第${newVal}周`;
});
// 监听 props 或对象某属性，用 getter：
watch(
  () => props.visible,
  (val) => console.log("visible =", val),
);
```

关键差异：

- **默认是懒执行**（类似 React 的 useEffect，但初次不跑，除非加 `{ immediate: true }`）。
- 能拿到**新值和旧值**两个参数。
- 监听整个 reactive 对象深层变化要 `{ deep: true }`（类似深比较，但会有性能成本）。
- 回调里返回的清理函数等价于 useEffect 的 return 清理。

```ts
watch(id, async (newId) => fetchData(newId), { immediate: true });
```

### 4.2 watchEffect：回调里用到谁就监听谁（立即执行）

```ts
watchEffect(() => {
  console.log("weeks 或 days 变化都会打印", weeks.value, form.days);
});
```

可粗略理解为「**不用写依赖数组、创建时立即执行一次的 useEffect**」。

### 4.3 心智对照

| React | Vue |
| --- | --- |
| `useEffect(fn, [a,b])` | `watch([a,b], fn)`（懒执行）或 `watchEffect(fn)`（立即执行） |
| `useLayoutEffect` | `watchEffect(fn, { flush: 'post' })` / 操作 DOM 用 `nextTick` |
| 依赖数组 `[]`（仅挂载） | 生命周期 `onMounted` |
| 组件卸载清理 | `onUnmounted` 或 watch 里返回清理函数 |

---

## 5. 组件传参与通信

### 5.1 props

```jsx
// React：props 是函数参数
function GaField({ label, modelValue, disabled = false }) { ... }
```

```vue
<!-- Vue：用编译宏 defineProps，不需要 import -->
<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    label: string;
    modelValue: string;
    disabled?: boolean;
  }>(),
  { disabled: false }, // withDefaults ≈ 默认参数
);
// 使用：props.label
</script>
```

### 5.2 子→父：React 用回调 props，Vue 用 emit 事件

```jsx
// React：传回调，子组件调用
<GaField label="CRL" value={crl} onChange={setCrl} />
// 子组件：onChange(newVal)
```

```vue
<!-- Vue：父组件监听事件，子组件 emit -->
<GaField label="CRL" :model-value="crl" @update:model-value="crl = $event" />
```

```ts
// 子组件
const emit = defineEmits<{
  (e: "update:modelValue", v: string): void;
}>();
emit("update:modelValue", "12.3");
```

React 哲学是「**props 传函数，直接调**」；Vue 哲学是「**props 向下、events 向上**」，更贴近 DOM 原生事件模型。

### 5.3 受控组件：value+onChange ↔ v-model

React 中每个受控输入都要手写 `value` + `onChange`。Vue 用 `v-model` 把这对绑定合成一句：

```vue
<!-- 这两句完全等价 -->
<GaField :model-value="crl" @update:model-value="crl = $event" />
<GaField v-model="crl" />
```

- 原生输入：`<input v-model="text" />` 等价于 React 的 `value={text} onChange={e=>setText(e.target.value)}`。
- 不同属性名用 `v-model:xxx`（如 `v-model:open`）。
- 本质仍是「**值由父组件持有，子组件只通知更新**」，不是真正双向，而是语法糖。

---

## 6. 模板：条件、列表、class

React 用 JS 表达式（三元、`&&`、`map`）；Vue 用模板指令。

```jsx
// React
{
  loading ? <Spinner /> : items.length === 0 ? <Empty /> : <List data={items} />;
}
<ul>
  {items.map((it) => (
    <li key={it.id} className={it.active ? "selected" : ""}>
      {it.name}
    </li>
  ))}
</ul>
```

```vue
<!-- Vue -->
<Spinner v-if="loading" />
<Empty v-else-if="items.length === 0" />
<List v-else :data="items" />
<ul>
  <li v-for="it in items" :key="it.id" :class="{ selected: it.active }">
    {{ it.name }}
  </li>
</ul>
```

对照：

| React (JSX) | Vue (template) |
| --- | --- |
| `cond && <X/>` / 三元 | `v-if` / `v-else-if` / `v-else` |
| `arr.map(...)` | `v-for="x in arr" :key="x.id"` |
| `className` | `class`（支持 `:class="{类名: 条件}"`） |
| `style={{}}` | `:style="{ }"` |
| `{expr}` | `{{ expr }}` |
| `onClick={fn}` | `@click="fn"` |
| `<X {...props} />` | `v-bind="obj"` |

> 注意：`v-if` 是真正不渲染；想「始终渲染只切换显示」用 `v-show`（相当于 `display:none`），类似你自己控制 `hidden`。

---

## 7. 插槽：children / render props ↔ slot

React 靠 `children` 和 render props 组合；Vue 靠 `<slot>`。

```jsx
// React
<Card title="头">
  <p>正文内容</p>
  <button>底部按钮</button>
</Card>
// Card 内部：props.children
```

```vue
<!-- Vue：默认插槽 + 具名插槽 -->
<Card title="头">
  <p>正文内容</p>
  <template #actions><button>底部按钮</button></template>
</Card>
<!-- Card 内部：<slot /> 和 <slot name="actions" /> -->
```

本项目 `GaPage.vue` 就是典型：正文放默认 `<slot />`，底部按钮放 `<slot name="actions" />`。

---

## 8. 生命周期对照

React 用 `useEffect` 组合表达生命周期；Vue 有具名钩子（从 `vue` 导入）。

| React | Vue 3 Composition API | 本项目用途 |
| --- | --- | --- |
| `useEffect(fn, [])` 挂载后 | `onMounted(fn)` | canvas 初始化 |
| `useEffect` return 清理 | `onUnmounted(fn)` | 移除监听 |
| （无精确对应） | `onBeforeMount` / `onBeforeUnmount` | — |
| 依赖更新（getDerivedState 类场景） | `onBeforeUpdate` / `onUpdated` | — |
| 下次渲染后操作 DOM | `nextTick(fn)` | 改完数据再重绘画布 |
| 监听 props 变化 | `watch(() => props.x, fn)` | — |

**nextTick** 很常用：Vue 的 DOM 更新是异步批量的（类似 React 的批量更新），改完状态后想等视图更新完再操作 DOM，要 `await nextTick()`，相当于「等下一次渲染提交」。

> uni-app 额外有页面/应用钩子，从 `@dcloudio/uni-app` 导入：`onLaunch`（应用启动）、`onLoad`（页面加载读路由参数）、`onShow`/`onHide`（页面显示/隐藏）。注意页面从下级返回不重新创建，只触发 `onShow`，所以 `onLoad` ≠ `onShow`。

---

## 9. 全局状态：Redux/Zustand/Context ↔ Pinia

```jsx
// Zustand 风格
const useProfile = create((set) => ({
  basis: null,
  saveBasis: (b) => set({ basis: b }),
}));
const basis = useProfile((s) => s.basis);
```

```ts
// Pinia：setup store，写法和组件几乎一样
export const useProfileStore = defineStore("pregnancy-profile", () => {
  const basis = ref(null);
  function saveBasis(b) {
    basis.value = b;
  }
  return { basis, saveBasis };
});
```

页面使用：

```ts
const profile = useProfileStore();
profile.basis; // 直接读，Pinia 自动解包 ref（不用 .value）
profile.saveBasis(b);
```

关键规则（对应 React 中「不要直接解构 zustand selector 之外的 store」）：

- **方法可以直接解构**：`const { saveBasis } = profile`，没问题。
- **状态不能直接解构**，否则丢失响应式：`const { basis } = profile` 后 basis 不会更新。
  - 要用 `storeToRefs(profile)`：`const { basis } = storeToRefs(profile)`，此时 `basis` 是 ref，脚本里读 `.value`。
  - 这与 Zustand 里用 selector 保持订阅是同一个道理。

---

## 10. 操作 DOM / 暴露方法：useRef ↔ 模板 ref + defineExpose

```jsx
// React
const inputRef = useRef(null);
useEffect(() => inputRef.current?.focus(), []);
// 想让父组件调子组件方法，要用 useImperativeHandle
```

```vue
<!-- Vue：ref 名和模板上的 ref 对应 -->
<script setup>
const canvasRef = ref(null);
onMounted(() => {
  canvasRef.value; // 指向组件或 DOM 节点
});
</script>
<template>
  <canvas ref="canvasRef" />
</template>
```

子组件想暴露方法给父组件用 `defineExpose`（等价于 `useImperativeHandle`）：

```ts
defineExpose({ redraw, exportPNG });
```

本项目 `GaShareCard.vue` 用了 `defineExpose`，`GaResultChart.vue` 用模板 ref 操作 canvas。

---

## 11. 模板里的内置指令速查

| 指令 | 含义 | React 类比 |
| --- | --- | --- |
| `v-bind:x` / `:x` | 绑定属性 | `x={}` |
| `v-on:e` / `@e` | 监听事件 | `onE={}` |
| `v-model` | 双向绑定语法糖 | `value+onChange` |
| `v-if/v-else` | 条件渲染 | 三元/`&&` |
| `v-show` | 切换 display | `hidden` |
| `v-for` | 列表 | `map` |
| `v-html` | 渲染 HTML 字符串 | `dangerouslySetInnerHTML` |
| `v-bind="obj"` | 批量绑定属性 | `{...props}` |

---

## 12. React 开发者最常踩的 6 个坑

1. **忘记 `.value`**：脚本里读写 ref 一律 `.value`；模板里不要写 `.value`。
2. **reactive 整体赋值**：`form = newObj` 会丢响应式，用 `Object.assign` 或改 `ref`。
3. **解构 store 状态**：直接解构丢响应式，用 `storeToRefs`；方法随便解构。
4. **用 useEffect 思维到处写 watch**：纯派生值用 `computed`，只有真正副作用才用 `watch`。
5. **依赖数组思维**：Vue 的 `computed/watchEffect` 自动收集依赖，**不要也不能写依赖数组**。
6. **以为组件函数会重跑**：Vue 里 setup 只执行一次，之后靠响应式更新；想在挂载时跑的逻辑放 `onMounted`，不要依赖“再渲染一次”。

---

## 13. 对照表（打印贴墙版）

| 概念 | React | Vue 3 |
| --- | --- | --- |
| 组件 | 函数返回 JSX | `.vue`（template+script+style） |
| 本地状态 | `useState` | `ref` / `reactive` |
| 派生值 | `useMemo` | `computed`（自动缓存） |
| 缓存函数 | `useCallback` | 不需要（模板自动） |
| 副作用 | `useEffect` | `watch` / `watchEffect` |
| 挂载/卸载 | `useEffect(fn,[])` | `onMounted` / `onUnmounted` |
| 等 DOM 更新 | （在 effect 中） | `nextTick` |
| 子组件入参 | props | `defineProps` |
| 子通知父 | 回调 props | `defineEmits` + `@` |
| 双向绑定 | value+onChange | `v-model` |
| 内容分发 | children / render props | `slot` |
| 强制暴露方法 | `useImperativeHandle` | `defineExpose` |
| DOM 引用 | `useRef` | 模板 ref |
| 全局状态 | Redux/Zustand/Context | Pinia |
| 状态解构保持订阅 | selector | `storeToRefs` |
| 列表 key | `key` | `:key` |
| 条件渲染 | 三元/`&&` | `v-if` |
| 性能优化 | memo/useMemo/useCallback | 默认已细粒度，`computed` 即可 |

---

## 14. 建议上手路径（结合本项目）

1. 先读最简组件 `components/GaButton.vue`、`GaCard.vue`，看 SFC 三段式。
2. 读 `components/GaField.vue`，吃透 `props + emit + v-model` 这套 React 里没有的约定。
3. 读 `components/GaTabs.vue`、`GaPage.vue`，看 `v-for`、`v-if`、具名插槽。
4. 顺着一个完整页面 `pages/pregnancy/edd.vue`：输入 ref → `computed` 自动算 → 模板按 `status` 渲染 → 手动调 store 保存。
5. 最后读 `store/profile.ts`，理解 setup store、`storeToRefs` 与持久化边界。

> 读完后若仍想看纯 Vue 侧说明，回到 `CODE-READING.md`；本文只负责帮你从 React「翻译」到 Vue 3。
