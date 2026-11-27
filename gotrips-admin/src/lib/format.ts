const businessZone = 'Asia/Ho_Chi_Minh'
const currency = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
const businessDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: businessZone, year: 'numeric', month: '2-digit', day: '2-digit',
})
const businessDateTime = new Intl.DateTimeFormat('en-GB', {
  timeZone: businessZone, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
})

export function formatVND(value: number) {
  return currency.format(value)
}

/** 3 ngày 2 đêm → "3N2Đ" (cách ghi quen thuộc của tour). */
export function formatDuration(days: number, nights: number) {
  return `${days}N${nights}Đ`
}

export function formatDate(date: string) {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  return parts ? `${parts[3]}/${parts[2]}/${parts[1]}` : '—'
}

export function formatDateTime(value: string) {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return '—'
  const parts = Object.fromEntries(businessDateTime.formatToParts(date).map(({ type, value }) => [type, value]))
  return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}`
}

export function getTodayInVietnam(now = new Date()) {
  const parts = Object.fromEntries(businessDate.formatToParts(now).map(({ type, value }) => [type, value]))
  return `${parts.year}-${parts.month}-${parts.day}`
}
