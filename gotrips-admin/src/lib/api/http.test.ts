import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiFetch, ApiError } from './http'

afterEach(() => {
  vi.unstubAllGlobals()
  document.cookie = 'XSRF-TOKEN=; Max-Age=0; Path=/'
})

describe('Client HTTP quản trị', () => {
  it.each(['GET', 'HEAD', 'OPTIONS', 'TRACE', 'post', 'PUT', 'PATCH', 'DELETE'])(
    'gửi cookie và gắn CSRF đúng cho method %s',
    async (method) => {
      const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }))
      vi.stubGlobal('fetch', fetcher)
      document.cookie = 'XSRF-TOKEN=test-csrf; Path=/'

      await expect(apiFetch('/admin/auth/me', { method })).resolves.toBeUndefined()
      expect(fetcher).toHaveBeenCalledWith('/api/admin/auth/me', expect.objectContaining({ credentials: 'include' }))
      const init = fetcher.mock.calls[0][1]
      const csrf = new Headers(init?.headers).get('X-XSRF-TOKEN')
      const write = ['post', 'PUT', 'PATCH', 'DELETE'].includes(method)
      expect(csrf).toBe(write ? 'test-csrf' : null)
    },
  )

  it('chuẩn hoá lỗi HTTP 401 thành ApiError', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('Unauthorized', { status: 401 })))
    const request = apiFetch('/admin/auth/me')
    await expect(request).rejects.toBeInstanceOf(ApiError)
    await expect(request).rejects.toMatchObject({ status: 401 })
  })
})
