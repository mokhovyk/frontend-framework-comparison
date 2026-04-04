/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<
    Record<string, unknown>,
    Record<string, unknown>,
    unknown
  >;
  export default component;
}

declare module 'shared-css/base.css' {
  const css: string;
  export default css;
}

declare module 'shared-css/table.css' {
  const css: string;
  export default css;
}

declare module 'shared-css/dashboard.css' {
  const css: string;
  export default css;
}

declare module 'shared-css/form.css' {
  const css: string;
  export default css;
}

declare module 'shared-css/layout.css' {
  const css: string;
  export default css;
}
