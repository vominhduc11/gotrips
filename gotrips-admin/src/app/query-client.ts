import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/lib/api/http'
import { adminMeOptions } from '@/features/auth/session'

export type SessionLoss = 'expired' | 'revoked'

export function createAppQueryClient(onSessionLost?: (reason: SessionLoss) => void) {
  const recheckSession = () => {
    // 403 có thể do quyền của chức năng hoặc do phiên đã mất quyền. Query phiên dùng chung lượt kiểm tra đang chạy.
    void client.fetchQuery(adminMeOptions()).catch(() => {})
  }

  const client = new QueryClient({
    queryCache: new QueryCache({
      onError(error, query) {
        if (!(error instanceof ApiError)) return
        // Loader xử lý lỗi khi chưa có phiên. Lỗi lúc làm mới phiên được xử lý tại đây.
        if (query.meta?.session && query.state.data === undefined) return
        if (error.status === 401) onSessionLost?.('expired')
        if (error.status === 403) {
          if (query.meta?.session) onSessionLost?.('revoked')
          else recheckSession()
        }
      },
    }),
    mutationCache: new MutationCache({
      onError(error, _variables, _context, mutation) {
        if (!(error instanceof ApiError) || mutation.meta?.publicLogin) return
        if (error.status === 401) onSessionLost?.('expired')
        if (error.status === 403) recheckSession()
      },
    }),
    defaultOptions: {
      queries: {
        retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 1,
      },
    },
  })
  return client
}
