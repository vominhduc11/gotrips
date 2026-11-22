import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import pluginQuery from '@tanstack/eslint-plugin-query'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // src/lib/api/generated là code do Orval sinh ra, không lint để tránh sửa tay.
  globalIgnores(['dist', 'src/lib/api/generated']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      // Bắt lỗi dùng TanStack Query sai (queryKey thiếu biến, queryKey không ổn định...).
      ...pluginQuery.configs['flat/recommended'],
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    // Phải đặt SAU object chính: flat config áp dụng object sau để ghi đè object trước.
    // Component shadcn export cả biến cấu hình (ví dụ buttonVariants) cùng component, theo registry gốc.
    // Tắt rule HMR riêng cho thư mục này để giữ nguyên file khi sinh lại bằng shadcn.
    files: ['src/components/ui/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
