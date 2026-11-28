import { afterEach, describe, expect, it, vi } from 'vitest'
import { adminMeOptions } from '@/features/auth/session'
import { createAppQueryClient } from './query-client'
import { ApiError } from '@/lib/api/http'
import type { UserResponse } from '@/lib/api/generated/model'

afterEach(() => vi.unstubAllGlobals())

describe('Xử lý hết phiên', () => {
  it.each([200, 403])('kiểm lại me sau lỗi 403 của query và mutation cùng lúc (%s)', async (status) => {
    const onSessionLost = vi.fn()
    const client = createAppQueryClient(onSessionLost)
    const session: UserResponse = { id: 'staff', roles: ['STAFF'], fullName: 'Nhân viên', email: 'staff@example.com', phone: null }
    client.setQueryData(adminMeOptions().queryKey, session)
    let finish!: (response: Response) => void
    const fetch = vi.fn(() => new Promise<Response>((resolve) => { finish = resolve }))
    vi.stubGlobal('fetch', fetch)
    const error = new ApiError({ status: 403, title: 'Forbidden' })
    const mutation = client.getMutationCache().build(client, { mutationFn: async () => { throw error } })
    await Promise.all([
      expect(client.fetchQuery({ queryKey: ['staff'], queryFn: async () => { throw error } })).rejects.toBe(error),
      expect(mutation.execute(undefined)).rejects.toBe(error),
    ])
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch.mock.calls[0]).toEqual(expect.arrayContaining(['/api/admin/auth/me']))
    finish(new Response(JSON.stringify(session), { status, headers: { 'Content-Type': 'application/json' } }))
    await vi.waitFor(() => expect(client.getQueryState(adminMeOptions().queryKey)?.fetchStatus).toBe('idle'))
    if (status === 403) expect(onSessionLost).toHaveBeenCalledExactlyOnceWith('revoked')
    else expect(onSessionLost).not.toHaveBeenCalled()
  })
  it('báo hết phiên từ query được bảo vệ và mất quyền từ lần làm mới me', async () => {
    const onSessionLost = vi.fn()
    const client = createAppQueryClient(onSessionLost)
    const unauthorized = new ApiError({ status: 401, title: 'Unauthorized' })
    const forbidden = new ApiError({ status: 403, title: 'Forbidden' })

    await expect(client.fetchQuery({
      queryKey: ['bookings'], queryFn: async () => { throw unauthorized },
    })).rejects.toBe(unauthorized)
    expect(onSessionLost).toHaveBeenLastCalledWith('expired')

    client.setQueryData(['session'], { roles: ['STAFF'] })
    await expect(client.fetchQuery({
      queryKey: ['session'], meta: { session: true }, queryFn: async () => { throw forbidden },
    })).rejects.toBe(forbidden)
    expect(onSessionLost).toHaveBeenLastCalledWith('revoked')
  })

  it('đăng nhập sai không kích hoạt xử lý hết phiên', async () => {
    const onSessionLost = vi.fn()
    const client = createAppQueryClient(onSessionLost)
    const error = new ApiError({ status: 401, title: 'Unauthorized' })
    const login = client.getMutationCache().build(client, {
      meta: { publicLogin: true },
      mutationFn: async () => { throw error },
    })

    await expect(login.execute(undefined)).rejects.toBe(error)
    expect(onSessionLost).not.toHaveBeenCalled()
  })
})
