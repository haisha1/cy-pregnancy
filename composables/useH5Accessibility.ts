/**
 * 组合式函数：把 H5 无障碍适配与挂载/卸载生命周期封装起来；use 前缀是 Vue composable 的常见命名习惯。
 */
import { getCurrentInstance, onMounted, onUnmounted } from "vue";

/** uni-app H5 wraps native inputs and renders actions as uni-button custom elements.
 * Bridge semantics at this platform boundary; mini-program semantics remain platform-owned.
 */
export function useH5Accessibility() {
  // #ifdef H5
  const instance = getCurrentInstance();
  let observer: MutationObserver | undefined;
  let root: HTMLElement | undefined;
  function set(element: Element, name: string, value: string) {
    if (element.getAttribute(name) !== value) element.setAttribute(name, value);
  }
  function adapt() {
    if (!root) return;
    root.querySelectorAll("uni-button").forEach((button) => {
      const disabled =
        button.getAttribute("disabled") === "true" ||
        button.classList.contains("uni-button-disabled");
      set(button, "role", "button");
      set(button, "tabindex", disabled ? "-1" : "0");
      set(button, "aria-disabled", String(disabled));
    });
    root.querySelectorAll("uni-input").forEach((wrapper) => {
      const input = wrapper.querySelector("input");
      if (!input) return;
      for (const attribute of [
        "aria-label",
        "aria-invalid",
        "aria-describedby",
      ]) {
        const value = wrapper.getAttribute(attribute);
        if (value !== null) set(input, attribute, value);
        else if (input.hasAttribute(attribute))
          input.removeAttribute(attribute);
      }
      if (wrapper.id) {
        set(input, "id", wrapper.id + "-native");
        root?.querySelectorAll("label").forEach((label) => {
          if (label.htmlFor === wrapper.id) label.htmlFor = input.id;
        });
      }
    });
  }
  function keydown(event: KeyboardEvent) {
    if (
      event.isComposing ||
      event.repeat ||
      (event.key !== "Enter" && event.key !== " ")
    )
      return;
    const target =
      event.target instanceof Element
        ? event.target.closest<HTMLElement>(
            "uni-button, [data-ga-picker-trigger]",
          )
        : null;
    if (!target || target.getAttribute("aria-disabled") === "true") return;
    event.preventDefault();
    target.click();
  }
  // Vue 挂载钩子：组件渲染后执行，适合访问画布或 H5 DOM；它不等同于页面每次重新显示。
  onMounted(() => {
    root = instance?.proxy?.$el as HTMLElement | undefined;
    if (!root?.querySelectorAll) return;
    adapt();
    root.addEventListener("keydown", keydown);
    observer = new MutationObserver(adapt);
    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        "disabled",
        "aria-label",
        "aria-invalid",
        "aria-describedby",
        "class",
      ],
    });
  });
  // Vue 卸载钩子：释放该组件创建的监听器或观察器，避免页面销毁后仍收到回调。
  onUnmounted(() => {
    observer?.disconnect();
    root?.removeEventListener("keydown", keydown);
  });
  // #endif
}
