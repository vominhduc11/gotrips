"use client";

import { CalendarDays } from "lucide-react";
import { useState, type Ref } from "react";
import { vi } from "react-day-picker/locale";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { diffInDays, fromIsoDate, toIsoDate } from "@/lib/iso-date";
import { getTodayInVietnam } from "@/lib/data/tour-view";
import { fieldTriggerClass, placeholderClass } from "./search-field-styles";

/**
 * Bộ chọn ngày cho form Tour / Khách sạn / Vé máy bay: nút mở `Popover` chứa `Calendar` của shadcn (react-day-picker).
 * Giá trị vào/ra là chuỗi `YYYY-MM-DD` (không múi giờ), khớp với schema Zod.
 *
 * LƯU Ý về `cacheComponents`: Trang chủ được prerender, mà đọc "hôm nay" (`new Date()`) trong lúc prerender sẽ làm
 * hỏng build. Vì vậy "hôm nay" chỉ được tính bên trong các panel lịch dưới đây (`useState` khởi tạo lười) —
 * chúng chỉ render khi khách mở Popover, tức là ở trình duyệt, không bao giờ trong static shell.
 */

// Ô lịch 40px (mặc định của shadcn là 28px, quá nhỏ để chạm trên điện thoại).
const calendarClass = "[--cell-size:--spacing(10)]";

interface TriggerProps {
  id: string;
  /** `id` của thẻ nhãn; ghép với chính nút để tên truy cập có cả nhãn lẫn giá trị đang chọn. */
  labelId: string;
  invalid?: boolean;
  describedBy?: string;
  ref?: Ref<HTMLButtonElement>;
}

function PickerTrigger({
  id,
  labelId,
  invalid,
  describedBy,
  ref,
  empty,
  children,
}: TriggerProps & { empty: boolean; children: string }) {
  return (
    <PopoverTrigger asChild>
      <Button
        ref={ref}
        id={id}
        variant="ghost"
        size="lg"
        className={fieldTriggerClass}
        aria-labelledby={`${labelId} ${id}`}
        aria-describedby={describedBy}
        data-invalid={invalid || undefined}
      >
        <span className={cn("min-w-0 truncate", empty && placeholderClass)}>{children}</span>
        <CalendarDays aria-hidden="true" className="size-5 shrink-0 text-primary-700" />
      </Button>
    </PopoverTrigger>
  );
}

/** Ngày nhỏ nhất được chọn: lớn hơn của (hôm nay, `minDate`). So sánh chuỗi ISO là đúng thứ tự thời gian. */
function SingleCalendarPanel({
  value,
  minDate,
  onPick,
}: {
  value: string;
  minDate?: string;
  onPick: (value: string) => void;
}) {
  const [today] = useState(getTodayInVietnam);
  const min = minDate && minDate > today ? minDate : today;
  const selected = fromIsoDate(value);
  const minDay = fromIsoDate(min);

  return (
    <Calendar
      mode="single"
      required
      locale={vi}
      selected={selected}
      defaultMonth={selected ?? minDay}
      disabled={minDay ? { before: minDay } : undefined}
      onSelect={(date) => onPick(toIsoDate(date))}
      showOutsideDays={false}
      autoFocus
      className={calendarClass}
    />
  );
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Chọn ngày",
  minDate,
  ...trigger
}: TriggerProps & {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Không cho chọn trước ngày này (mặc định chỉ chặn ngày đã qua). */
  minDate?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PickerTrigger {...trigger} empty={!value}>
        {value ? formatDate(value) : placeholder}
      </PickerTrigger>
      <PopoverContent align="start" collisionPadding={8} className="w-auto p-0">
        <SingleCalendarPanel
          value={value}
          minDate={minDate}
          onPick={(next) => {
            onChange(next);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

function RangeCalendarPanel({
  from,
  to,
  onPick,
}: {
  from: string;
  to: string;
  onPick: (from: string, to: string) => void;
}) {
  const [today] = useState(getTodayInVietnam);
  const todayDay = fromIsoDate(today);

  return (
    <Calendar
      mode="range"
      locale={vi}
      selected={{ from: fromIsoDate(from), to: fromIsoDate(to) }}
      defaultMonth={fromIsoDate(from) ?? todayDay}
      disabled={todayDay ? { before: todayDay } : undefined}
      // Ngày trả phải sau ngày nhận ít nhất 1 đêm; bấm lần nữa khi đã đủ khoảng thì bắt đầu khoảng mới.
      min={1}
      resetOnSelect
      numberOfMonths={2}
      showOutsideDays={false}
      onSelect={(range) => onPick(range?.from ? toIsoDate(range.from) : "", range?.to ? toIsoDate(range.to) : "")}
      autoFocus
      className={calendarClass}
      // Điện thoại chỉ đủ chỗ cho một tháng: ẩn tháng thứ hai (phần tử con cuối của `months`; con đầu là nav
      // chứ không phải tháng nên không dùng nth-child). Từ màn hình md trở lên hiện cả hai tháng.
      classNames={{ month: "flex w-full flex-col gap-4 max-md:last:hidden" }}
    />
  );
}

/** Chọn một khoảng ngày (nhận phòng → trả phòng) trong cùng một lịch. */
export function DateRangePicker({
  from,
  to,
  onChange,
  placeholder = "Chọn ngày nhận và trả phòng",
  ...trigger
}: TriggerProps & {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);

  const nights = from && to ? diffInDays(to, from) : 0;
  const text = from
    ? `${formatDate(from)} → ${to ? formatDate(to) : "…"}${nights > 0 ? ` (${nights} đêm)` : ""}`
    : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PickerTrigger {...trigger} empty={!from}>
        {text}
      </PickerTrigger>
      <PopoverContent
        align="start"
        collisionPadding={8}
        className="max-h-(--radix-popover-content-available-height) w-auto overflow-y-auto p-0"
      >
        <RangeCalendarPanel
          from={from}
          to={to}
          onPick={(nextFrom, nextTo) => {
            onChange(nextFrom, nextTo);
            // Chọn đủ hai đầu thì đóng; mới chọn ngày nhận thì giữ lịch mở để chọn tiếp ngày trả.
            if (nextFrom && nextTo) setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
