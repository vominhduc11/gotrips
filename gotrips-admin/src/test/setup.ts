import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Vitest không bật globals nên RTL không tự dọn DOM giữa các test; phải gọi cleanup thủ công.
afterEach(() => {
  cleanup()
})

// jsdom không có window.matchMedia. Hook useIsMobile của sidebar cần nó để chạy.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }),
})
