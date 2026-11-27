import { differenceInCalendarDays, format, parseISO, subDays } from 'date-fns'
import { z } from 'zod'
import { getTodayInVietnam } from '@/lib/format'

const preset = z.enum(['7', '30', '90'])
const date = z.iso.date().refine((value) => !value.startsWith('0000'))
const rangeSchema = z.discriminatedUnion('range', [
  z.object({ range: preset }),
  z.object({ range: z.literal('custom'), from: date, to: date }),
])

export type DashboardRange = z.infer<typeof rangeSchema>
export type DashboardPreset = z.infer<typeof preset>

export function isDashboardDateRange(from: string, to: string, today: string) {
  return date.safeParse(from).success && date.safeParse(to).success &&
    from <= to && to <= today && differenceInCalendarDays(parseISO(to), parseISO(from)) < 366
}

export function parseDashboardRange(params: URLSearchParams, today = getTodayInVietnam()): DashboardRange {
  const parsed = rangeSchema.safeParse(Object.fromEntries(params))
  if (!parsed.success) return { range: '30' }
  const value = parsed.data
  if (value.range === 'custom' && !isDashboardDateRange(value.from, value.to, today)) return { range: '30' }
  return value
}

export function dashboardDates(value: DashboardRange, today: string) {
  if (value.range === 'custom') return { from: value.from, to: value.to }
  return { from: format(subDays(parseISO(today), Number(value.range) - 1), 'yyyy-MM-dd'), to: today }
}

export function buildDashboardSearch(value: DashboardRange) {
  return new URLSearchParams(value.range === 'custom'
    ? { range: value.range, from: value.from, to: value.to }
    : { range: value.range })
}
