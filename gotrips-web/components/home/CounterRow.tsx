"use client";

import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Một dòng chỉnh số lượng (người lớn, trẻ em, phòng...) bằng hai nút −/+.
 * `min`/`max` do nơi gọi tính (gồm cả ràng buộc chéo như "em bé ≤ người lớn") — nút chạm giới hạn thì bị khoá,
 * nên khách không tạo được tổ hợp vô lý. Schema Zod vẫn kiểm lại lúc submit.
 */
export function CounterRow({
  label,
  hint,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const name = label.toLowerCase();

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="font-semibold text-ink">{label}</p>
        {hint ? <p className="text-sm text-ink-muted">{hint}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          aria-label={`Giảm ${name}`}
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
        >
          <Minus aria-hidden="true" className="size-4" />
        </Button>
        {/* aria-live để trình đọc màn hình đọc lại số mới sau mỗi lần bấm. */}
        <span aria-live="polite" className="w-8 text-center text-base font-semibold tabular-nums text-ink">
          {value}
        </span>
        <Button
          variant="outline"
          size="icon"
          aria-label={`Tăng ${name}`}
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
        >
          <Plus aria-hidden="true" className="size-4" />
        </Button>
      </div>
    </div>
  );
}
