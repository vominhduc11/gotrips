import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState, type ReactNode } from 'react'
import { Toaster } from '@/components/ui/sonner'

/**
 * Gom các provider toàn cục: TanStack Query và Toaster của Sonner.
 * Devtools chỉ hiện khi chạy dev; bản build production được Vite loại bỏ theo điều kiện DEV.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  // Tạo QueryClient trong state để cache không bị dùng chung giữa các lần mount (ví dụ khi test).
  const [queryClient] = useState(() => new QueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      <Toaster />
    </QueryClientProvider>
  )
}
