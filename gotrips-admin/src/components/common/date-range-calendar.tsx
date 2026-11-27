import { format, parseISO } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Calendar } from '@/components/ui/calendar'

export function DateRangeCalendar({ from, to, latestDate, onChange }: {
  from?: string
  to?: string
  latestDate?: string
  onChange: (from?: string, to?: string) => void
}) {
  const start = from ? parseISO(from) : undefined
  const end = to ? parseISO(to) : undefined
  const latest = latestDate ? parseISO(latestDate) : undefined
  return (
    <Calendar locale={vi} mode="range" defaultMonth={start ?? end ?? latest}
      endMonth={latest} disabled={latest ? { after: latest } : undefined}
      selected={{ from: start, to: end }}
      onSelect={(range) => onChange(
        range?.from ? format(range.from, 'yyyy-MM-dd') : undefined,
        range?.to ? format(range.to, 'yyyy-MM-dd') : undefined,
      )} />
  )
}
