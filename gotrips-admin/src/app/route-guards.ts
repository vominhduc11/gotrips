import type { QueryClient } from '@tanstack/react-query'
import { redirect, type LoaderFunctionArgs } from 'react-router'
import { adminLogout } from '@/lib/api/generated/api'
import { ApiError } from '@/lib/api/http'
import { buildLoginHref } from '@/lib/safe-redirect'
import { adminMeOptions, hasAdminRole } from '@/features/auth/session'

async function loadStaffSession(queryClient: QueryClient, request: Request, fresh = false) {
  const options = adminMeOptions()
  try {
    if (fresh && queryClient.getQueryData(options.queryKey)) {
      return await queryClient.fetchQuery(options)
    }
    return await queryClient.ensureQueryData(options)
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      queryClient.clear()
      const { pathname, search, hash } = new URL(request.url)
      throw redirect(buildLoginHref(pathname + search + hash, error.status === 403))
    }
    throw error
  }
}

export function requireStaff(queryClient: QueryClient) {
  return ({ request }: LoaderFunctionArgs) => loadStaffSession(queryClient, request)
}

export function requireAdmin(queryClient: QueryClient) {
  return async ({ request }: LoaderFunctionArgs) => {
    const user = await loadStaffSession(queryClient, request, true)
    if (!hasAdminRole(user)) throw new Response(null, { status: 403 })
    return user
  }
}

export function loginLoader(queryClient: QueryClient) {
  return async ({ request }: LoaderFunctionArgs) => {
    const revoked = new URL(request.url).searchParams.get('reason') === 'access-revoked'
    try {
      // Cần gọi API để lấy cookie CSRF, kể cả khi chưa có phiên.
      await queryClient.fetchQuery(adminMeOptions())
    } catch (error) {
      if (!(error instanceof ApiError) || (error.status !== 401 && error.status !== 403)) throw error
      queryClient.clear()
      if (error.status === 403) {
        // Cookie phiên là HttpOnly nên cần API xoá khi quyền đã bị thu hồi.
        const signedOut = await adminLogout().then(() => true, () => false)
        if (signedOut) {
          // Logout xoá cả CSRF. Lấy lại cookie để form có thể gửi ngay.
          await queryClient.fetchQuery(adminMeOptions()).catch((refreshError: unknown) => {
            if (!(refreshError instanceof ApiError) || refreshError.status !== 401) throw refreshError
          })
        }
        return { revoked: true }
      }
      return { revoked }
    }
    throw redirect('/')
  }
}
