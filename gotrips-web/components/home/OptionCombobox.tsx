"use client";

import { ChevronsUpDown } from "lucide-react";
import { useState, type Ref } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/cn";
import { normalizeSearchText } from "@/lib/format";
import { fieldTriggerClass, placeholderClass } from "./search-field-styles";

export interface ComboboxOption {
  /** Giá trị lưu vào form (slug điểm đến, mã IATA...). */
  value: string;
  /** Chữ hiện trên ô sau khi chọn. */
  label: string;
  /** Dòng phụ trong danh sách (vùng miền, tên sân bay...). */
  description?: string;
  /** Các chữ khác để tìm ra lựa chọn này (tên thành phố, mã...). */
  keywords?: string[];
}

/**
 * Lọc không phân biệt hoa/thường/dấu: gõ "ha noi" vẫn ra "Hà Nội", gõ "han" ra sân bay HAN.
 * Bộ lọc mặc định của cmdk là so khớp mờ theo từng ký tự, không bỏ dấu nên với tiếng Việt kết quả rất lạ.
 * Trả 1 = hiện, 0 = ẩn.
 */
function matchesSearch(value: string, search: string, keywords?: string[]): number {
  const haystack = normalizeSearchText([value, ...(keywords ?? [])].join(" "));
  return haystack.includes(normalizeSearchText(search)) ? 1 : 0;
}

/**
 * Ô chọn có tìm kiếm (combobox) dựng từ `Popover` + `Command` của shadcn. Dùng cho Điểm đến (khách sạn)
 * và Sân bay (vé máy bay). Nút kích hoạt có `role="combobox"`, nhãn ghép từ thẻ nhãn + giá trị đang chọn.
 */
export function OptionCombobox({
  id,
  labelId,
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder,
  emptyText,
  invalid,
  describedBy,
  ref,
}: {
  id: string;
  labelId: string;
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  invalid?: boolean;
  describedBy?: string;
  ref?: Ref<HTMLButtonElement>;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={ref}
          id={id}
          type="button"
          role="combobox"
          variant="ghost"
          size="lg"
          className={fieldTriggerClass}
          aria-labelledby={`${labelId} ${id}`}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          data-invalid={invalid || undefined}
        >
          <span className={cn("min-w-0 truncate", !selected && placeholderClass)}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronsUpDown aria-hidden="true" className="size-4 shrink-0 text-ink-muted" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        collisionPadding={8}
        className="w-(--radix-popover-trigger-width) min-w-64 p-0"
      >
        <Command filter={matchesSearch}>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  keywords={option.keywords}
                  data-checked={option.value === value}
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">{option.label}</span>
                    {option.description ? (
                      <span className="truncate text-xs text-ink-muted">{option.description}</span>
                    ) : null}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
