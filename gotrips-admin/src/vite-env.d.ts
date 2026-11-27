/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Địa chỉ gốc của API (không có dấu / cuối). Vite nhúng giá trị này lúc build. */
  readonly VITE_API_URL?: string
  /** Địa chỉ website khách cho liên kết "Xem trên website". Mặc định http://localhost:3000. */
  readonly VITE_WEB_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
