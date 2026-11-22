"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";

/**
 * Provider dùng chung cho cả site: TanStack Query + toast Sonner.
 * TanStack Query chỉ dành cho dữ liệu phía client riêng từng người dùng (xem CLAUDE.md);
 * dữ liệu hiển thị trang vẫn đọc ở Server Component qua `lib/data/*`.
 */
export function Providers({ children }: { children: ReactNode }) {
  // Tạo bằng useState để mỗi lần render server có client riêng, còn trình duyệt giữ nguyên một client.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          // Dữ liệu coi là còn mới trong 60 giây để không refetch liên tục khi chuyển trang.
          queries: { staleTime: 60_000 },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
      {process.env.NODE_ENV === "development" ? <ReactQueryDevtools initialIsOpen={false} /> : null}
    </QueryClientProvider>
  );
}
