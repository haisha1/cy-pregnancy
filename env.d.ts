/// <reference types="@dcloudio/types" />
declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<object, object, any>;
  export default component;
}
interface ImportMeta {
  readonly env: { readonly DEV: boolean; readonly VITE_API_BASE_URL?: string };
}
