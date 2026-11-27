import { CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DateRangeCalendar } from '@/components/common/date-range-calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { formatDate } from '@/lib/format'

interface BookingDateFilterProps {
  from?: string
  to?: string
  onChange: (from?: string, to?: string) => void
}

export function BookingDateFilter({ from, to, onChange }: BookingDateFilterProps) {
  const label = [from && `Từ ${formatDate(from)}`, to && `đến ${formatDate(to)}`].filter(Boolean).join(' ')
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" aria-label={label ? `Ngày tạo, ${label}` : 'Ngày tạo'}>
          <CalendarDays aria-hidden="true" />{label || 'Ngày tạo'}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto">
        <DateRangeCalendar from={from} to={to} onChange={onChange} />
        {(from || to) && <Button type="button" variant="ghost" onClick={() => onChange()}>Xoá khoảng ngày</Button>}
      </PopoverContent>
    </Popover>
  )
}
