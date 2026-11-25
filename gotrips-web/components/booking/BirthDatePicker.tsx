"use client";

import { CalendarDays, X } from "lucide-react";
import { useState, type Ref } from "react";
import { vi } from "react-day-picker/locale";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/cn";
import { getTodayInVietnam } from "@/lib/data/tour-view";
import { formatDate } from "@/lib/format";
import { fromIsoDate, toIsoDate } from "@/lib/iso-date";

/** Tháng sớm nhất có trong ô chọn năm. */
const EARLIEST_MONTH = fromIsoDate("1920-01-01");
/** Tháng mở sẵn khi chưa chọn ngày (gần giữa dải năm, đỡ phải cuộn nhiều). */
const DEFAULT_MONTH = fromIsoDate("1990-01-01");

/**
 * Lịch chọn ngày sinh: có ô chọn tháng/năm (`captionLayout="dropdown"`) vì ngày sinh thường cách hiện tại hàng chục năm.
 * "Hôm nay" (không cho chọn ngày tương lai) chỉ tính trong panel — panel chỉ render khi mở Popover, tức là ở trình
 * duyệt, nên không vi phạm quy tắc "không đọc hôm nay lúc render" (xem `DatePickers.tsx`).
 */
function BirthCalendarPanel({ value, onPick }: { value: string; onPick: (value: string) => void }) {
  const [today] = useState(getTodayInVietnam);
  const todayDay = fromIsoDate(today);
  const selected = fromIsoDate(value);

  return (
    <Calendar
      mode="single"
      captionLayout="dropdown"
      locale={vi}
      selected={selected}
      defaultMonth={selected ?? DEFAULT_MONTH}
      startMonth={EARLIEST_MONTH}
      endMonth={todayDay}
      disabled={todayDay ? { after: todayDay } : undefined}
      onSelect={(date) => onPick(date ? toIsoDate(date) : "")}
      autoFocus
      className="[--cell-size:--spacing(10)]"
    />
  );
}

/**
 * Ô ngày sinh (không bắt buộc). Giá trị là `YYYY-MM-DD` hoặc `""` khi chưa chọn.
 * Tên truy cập = nhãn (`labelId`) + chữ trên nút, để trình đọc màn hình đọc cả "Ngày sinh" lẫn ngày đang chọn.
 */
export function BirthDatePicker({
  id,
  labelId,
  value,
  onChange,
  invalid,
  describedBy,
  ref,
}: {
  id: string;
  labelId: string;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  describedBy?: string;
  ref?: Ref<HTMLButtonElement>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            id={id}
            variant="ghost"
            aria-labelledby={`${labelId} ${id}`}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            className={cn(
              "h-11 min-w-0 flex-1 justify-between rounded-lg border border-input bg-surface px-3 font-normal hover:bg-surface",
              "aria-invalid:border-destructive",
            )}
          >
            <span className={cn("truncate", !value && "text-ink-muted")}>
              {value ? formatDate(value) : "Chọn ngày sinh"}
            </span>
            <CalendarDays aria-hidden="true" className="size-5 text-primary-700" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" collisionPadding={8} className="w-auto p-0">
          <BirthCalendarPanel
            value={value}
            onPick={(next) => {
              onChange(next);
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
      {value ? (
        <Button variant="ghost" size="icon" aria-label="Xoá ngày sinh" onClick={() => onChange("")}>
          <X aria-hidden="true" className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}
