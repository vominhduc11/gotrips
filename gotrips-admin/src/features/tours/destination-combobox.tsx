import { ChevronsUpDown } from 'lucide-react'
import { useState, type ComponentProps } from 'react'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { AdminDestinationResponse } from '@/lib/api/generated/model'
import { removeDiacritics } from '@/lib/slug'

type Props = Omit<ComponentProps<typeof Button>, 'value' | 'onChange'> & {
  destinations: AdminDestinationResponse[] | undefined
  /** Id điểm đến dạng chữ; chuỗi rỗng = chưa chọn. */
  value: string
  onValueChange: (value: string) => void
}

/** Chọn điểm đến có ô tìm, không phân biệt dấu ("da lat" tìm được "Đà Lạt"). */
export function DestinationCombobox({ destinations, value, onValueChange, ref, ...buttonProps }: Props) {
  const [open, setOpen] = useState(false)
  const selected = destinations?.find((destination) => String(destination.id) === value)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button ref={ref} type="button" variant="outline" role="combobox" aria-expanded={open} {...buttonProps}>
          {/* Chữ chiếm hết chỗ trống nên mũi tên dạt sang phải. Không truyền `justify-*`: cn() chưa gộp class. */}
          <span className="flex-1 truncate text-left">
            {selected?.name ?? (destinations ? 'Chọn điểm đến' : 'Đang tải điểm đến…')}
          </span>
          <ChevronsUpDown aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72">
        {/* cmdk đặt nhãn cho ô tìm từ `label` của Command (không phải aria-label của ô). */}
        <Command label="Tìm điểm đến"
          filter={(itemValue, search) => removeDiacritics(itemValue).includes(removeDiacritics(search)) ? 1 : 0}>
          <CommandInput placeholder="Tìm điểm đến" />
          <CommandList>
            <CommandEmpty>Không có điểm đến phù hợp.</CommandEmpty>
            <CommandGroup>
              {destinations?.map((destination) => (
                <CommandItem key={destination.id} value={`${destination.name} ${destination.slug}`}
                  data-checked={destination.id === selected?.id}
                  onSelect={() => {
                    onValueChange(String(destination.id))
                    setOpen(false)
                  }}>
                  {destination.name}
                  {destination.id === selected?.id && <span className="sr-only">(đang chọn)</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
