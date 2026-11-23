"use client";

import { ChevronsUpDown } from "lucide-react";
import { useState, type ReactNode, type Ref } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { fieldTriggerClass } from "./search-field-styles";

/**
 * Khung dùng chung cho các ô "chỉnh số lượng trong Popover": số khách + số phòng (khách sạn) và hành khách
 * (vé máy bay). Nút hiện tóm tắt (`summary`), Popover chứa các `CounterRow` (`children`) và nút "Xong".
 */
export function CounterPopover({
  id,
  labelId,
  summary,
  invalid,
  describedBy,
  ref,
  children,
}: {
  id: string;
  labelId: string;
  /** Chữ tóm tắt trên nút, ví dụ "2 khách · 1 phòng". */
  summary: string;
  invalid?: boolean;
  describedBy?: string;
  ref?: Ref<HTMLButtonElement>;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
          <span className="min-w-0 truncate">{summary}</span>
          <ChevronsUpDown aria-hidden="true" className="size-4 shrink-0 text-ink-muted" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" collisionPadding={8} className="w-80 max-w-[calc(100vw-2rem)] gap-4 p-4">
        {children}
        <Button size="sm" className="w-full" onClick={() => setOpen(false)}>
          Xong
        </Button>
      </PopoverContent>
    </Popover>
  );
}
