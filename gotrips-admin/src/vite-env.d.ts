/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Địa chỉ gốc của API (không có dấu / cuối). Vite nhúng giá trị này lúc build. */
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
