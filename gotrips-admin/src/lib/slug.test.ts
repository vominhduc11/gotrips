import { describe, expect, it } from 'vitest'
import { removeDiacritics, slugify, slugPattern } from './slug'

describe('slugify', () => {
  it.each([
    ['Đà Lạt 3N2Đ – Thành phố ngàn hoa', 'da-lat-3n2d-thanh-pho-ngan-hoa'],
    ['  Phú Quốc:  Đảo ngọc!  ', 'phu-quoc-dao-ngoc'],
    ['Sapa – Bản H’Mông & ruộng bậc thang', 'sapa-ban-h-mong-ruong-bac-thang'],
    ['Hạ Long (2N1Đ) 100%', 'ha-long-2n1d-100'],
    ['ĐƯỜNG ĐẾN HUẾ', 'duong-den-hue'],
  ])('%s → %s', (text, slug) => {
    expect(slugify(text, 150)).toBe(slug)
    expect(slug).toMatch(slugPattern)
  })

  it('xử lý cả chữ có dấu dạng tổ hợp (NFD) mà một số bàn phím gửi lên', () => {
    expect(slugify('Đà Lạt'.normalize('NFD'), 150)).toBe('da-lat')
  })

  it('cắt đúng độ dài tối đa và không để lại gạch ngang cuối', () => {
    expect(slugify('abcd efgh', 5)).toBe('abcd')
    expect(slugify('a'.repeat(200), 60)).toHaveLength(60)
  })

  it('trả chuỗi rỗng khi không còn ký tự dùng được', () => {
    expect(slugify('– !!! –', 150)).toBe('')
  })

  it('bỏ dấu để tìm kiếm không phân biệt dấu', () => {
    expect(removeDiacritics('Đà Nẵng')).toBe('da nang')
  })
})
