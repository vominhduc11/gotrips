import { describe, expect, it } from 'vitest'
import { getTodayInVietnam } from '@/lib/format'
import { buildDashboardSearch, dashboardDates, parseDashboardRange } from './dashboard-filters'

const today = getTodayInVietnam(new Date('2026-11-24T18:30:00Z'))

describe('Khoảng ngày Tổng quan', () => {
  it.each([
    ['7', '2026-11-19'],
    ['30', '2026-10-27'],
    ['90', '2026-08-28'],
  ])('tính đủ %s ngày từ hôm nay ở Việt Nam', (range, from) => {
    const value = parseDashboardRange(new URLSearchParams({ range }), today)
    expect(dashboardDates(value, today)).toEqual({ from, to: '2026-11-25' })
  })

  it.each([
    '',
    'range=12',
    'range=custom',
    'range=custom&from=2026-11-25&to=2026-11-26',
    'range=custom&from=2026-11-25&to=2026-11-24',
    'range=custom&from=2026-02-29&to=2026-11-25',
    'range=custom&from=2025-11-24&to=2026-11-25',
  ])('trở về 30 ngày nếu URL thiếu hoặc sai (%s)', (search) => {
    expect(parseDashboardRange(new URLSearchParams(search), today)).toEqual({ range: '30' })
  })

  it.each(['2025-11-25', '2026-11-25'])('giữ khoảng hợp lệ từ %s', (from) => {
    const value = { range: 'custom', from, to: today } as const
    expect(parseDashboardRange(buildDashboardSearch(value), today)).toEqual(value)
    expect(dashboardDates(value, today)).toEqual({ from, to: today })
  })
})
