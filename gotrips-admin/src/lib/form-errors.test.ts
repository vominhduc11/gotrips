import { describe, expect, it, vi } from 'vitest'
import { SERVICE_UNAVAILABLE } from '@/components/common/error-state'
import { ApiError } from '@/lib/api/http'
import { applyApiErrors } from './form-errors'

type Values = { slug: string; title: string }
const fields = ['title', 'slug'] as const

function failure(status: number, errors?: { field: string; message: string }[], detail?: string) {
  return new ApiError({ status, title: 'Lỗi', detail, errors })
}

describe('applyApiErrors', () => {
  it.each([400, 409])('gắn lỗi %s vào đúng ô, focus ô đầu tiên theo thứ tự trên form', (status) => {
    const setError = vi.fn()
    const message = applyApiErrors<Values>(failure(status, [
      { field: 'slug', message: 'Slug này đã được dùng.' },
      { field: 'title', message: 'Vui lòng nhập tên.' },
    ], 'Câu chung'), fields, setError)

    expect(message).toBeNull()
    expect(setError.mock.calls).toEqual([
      ['title', { message: 'Vui lòng nhập tên.' }, { shouldFocus: true }],
      ['slug', { message: 'Slug này đã được dùng.' }, { shouldFocus: false }],
    ])
  })

  it('gắn lỗi của phần tử trong danh sách (kiểu `images[1].url` của API) vào đúng dòng', () => {
    type Gallery = { images: { url: string; alt: string }[] }
    const setError = vi.fn()
    const message = applyApiErrors<Gallery>(
      failure(400, [{ field: 'images[1].url', message: 'Ảnh này đã có trong bộ ảnh.' }]),
      ['images.0.url', 'images.0.alt', 'images.1.url', 'images.1.alt'], setError,
    )

    expect(message).toBeNull()
    expect(setError.mock.calls).toEqual([
      ['images.1.url', { message: 'Ảnh này đã có trong bộ ảnh.' }, { shouldFocus: true }],
    ])
  })

  it('đưa lỗi không có ô tương ứng lên đầu form nhưng vẫn gắn các ô biết được', () => {
    const setError = vi.fn()
    const message = applyApiErrors<Values>(failure(400, [
      { field: 'slug', message: 'Sai' }, { field: 'khongCo', message: 'Lạ' },
    ], 'Dữ liệu gửi lên không hợp lệ'), fields, setError)

    expect(message).toBe('Dữ liệu gửi lên không hợp lệ')
    expect(setError).toHaveBeenCalledOnce()
  })

  it('hiện detail của 409 không gắn ô (tour đã xoá)', () => {
    expect(applyApiErrors<Values>(failure(409, undefined, 'Tour đã bị xoá.'), fields, vi.fn())).toBe('Tour đã bị xoá.')
  })

  it.each([
    [failure(500, undefined, 'stack trace'), SERVICE_UNAVAILABLE],
    [failure(502), SERVICE_UNAVAILABLE],
    [new TypeError('Failed to fetch'), SERVICE_UNAVAILABLE],
    [failure(403), 'Bạn không có quyền thực hiện thao tác này.'],
    [failure(401), null],
  ])('không để lộ lỗi hệ thống: %s', (error, expected) => {
    expect(applyApiErrors<Values>(error, fields, vi.fn())).toBe(expected)
  })
})
