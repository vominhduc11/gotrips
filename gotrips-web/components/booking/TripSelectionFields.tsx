"use client";

import { CalendarDays } from "lucide-react";
import { useFormContext, useWatch, type UseFormReturn } from "react-hook-form";
import { CounterRow } from "@/components/home/CounterRow";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { changeTripDeparture, getMaxGuests } from "@/lib/booking/steps";
import { cn } from "@/lib/cn";
import { formatDate, formatSeatsLeft, formatVND } from "@/lib/format";
import type { TripSelectionValues } from "@/lib/schemas/booking";
import type { TourDepartureView } from "@/lib/types";

/** `id` của ô chọn ngày (để nơi khác đưa focus tới, vd nút "Chọn ngày này" ở lịch khởi hành). */
export function tripDepartureFieldId(idPrefix: string): string {
  return `${idPrefix}-ngay`;
}

/**
 * Đổi chuyến trong form chọn chuyến: số khách tự hạ nếu chuyến mới ít chỗ hơn. Tách ra hàm để nút "Chọn ngày này"
 * (nằm ngoài component này) đổi chuyến theo đúng cùng luật với ô chọn ngày.
 */
export function applyTripDeparture(
  form: Pick<UseFormReturn<TripSelectionValues>, "getValues" | "setValue">,
  departureId: number,
  departures: TourDepartureView[],
) {
  const next = changeTripDeparture(form.getValues(), departureId, departures);
  form.setValue("departureId", next.departureId, { shouldValidate: true, shouldDirty: true });
  form.setValue("guests", next.guests, { shouldDirty: true });
}

/**
 * Ô chọn ngày khởi hành + số khách, dùng trong form có kiểu `TripSelectionValues` (thẻ "Đặt tour" ở trang chi tiết,
 * hộp thoại "Thay đổi" ở trang đặt tour). Ngày là `Select` của shadcn (Radix lo bàn phím + ARIA): mỗi lựa chọn có
 * ngày, số chỗ và giá; chuyến hết chỗ vẫn hiện để khách thấy lịch nhưng bị khoá.
 */
export function TripSelectionFields({
  idPrefix,
  departures,
}: {
  /** Tiền tố `id` các ô — trang có thể có hai form chọn chuyến nên không dùng id cố định. */
  idPrefix: string;
  departures: TourDepartureView[];
}) {
  const form = useFormContext<TripSelectionValues>();
  const {
    control,
    setValue,
    formState: { errors, isSubmitted },
  } = form;
  const [departureId, guests] = useWatch({ control, name: ["departureId", "guests"] });
  const selected = departures.find((d) => d.id === departureId && !d.isSoldOut);
  const maxGuests = getMaxGuests(selected);

  const selectId = tripDepartureFieldId(idPrefix);
  const seatsId = `${selectId}-cho`;
  const errorId = `${selectId}-loi`;
  // Chỉ nhắc số chỗ khi sắp hết (tạo cảm giác cần đặt sớm); còn nhiều chỗ thì dòng "Tối đa N khách" đã đủ.
  const showSeats = selected?.isAlmostFull ?? false;

  return (
    <div className="space-y-4">
      <Field data-invalid={errors.departureId ? true : undefined}>
        <FieldLabel htmlFor={selectId} className="font-semibold text-ink">
          Ngày khởi hành
        </FieldLabel>
        <Select
          value={departureId ? String(departureId) : ""}
          onValueChange={(value) => applyTripDeparture(form, Number(value), departures)}
        >
          <SelectTrigger
            id={selectId}
            aria-invalid={errors.departureId ? true : undefined}
            aria-describedby={errors.departureId ? errorId : showSeats ? seatsId : undefined}
            className="w-full border-neutral-500 bg-surface px-3 text-base text-ink hover:border-neutral-700 data-[size=default]:h-12"
          >
            {/* Ô chỉ hiện ngày cho gọn; giá và số chỗ nằm trong danh sách và phần tạm tính bên dưới. */}
            <SelectValue placeholder="Chọn ngày khởi hành">
              {selected ? (
                <span className="flex items-center gap-2">
                  <CalendarDays aria-hidden="true" className="size-4 text-primary-700" />
                  <time dateTime={selected.departureDate}>{formatDate(selected.departureDate)}</time>
                </span>
              ) : null}
            </SelectValue>
          </SelectTrigger>
          <SelectContent position="popper" className="max-h-80">
            {departures.map((departure) => (
              <SelectItem
                key={departure.id}
                value={String(departure.id)}
                disabled={departure.isSoldOut}
                // `*:[span]:last:flex-1`: phần chữ của lựa chọn giãn hết chiều ngang để giá căn sát phải.
                className="py-2 pl-2.5 *:[span]:last:flex-1"
              >
                <span className="flex w-full items-center justify-between gap-4">
                  <span>
                    <span className="block font-semibold text-ink">{formatDate(departure.departureDate)}</span>
                    <span
                      className={cn(
                        "block text-xs",
                        departure.isAlmostFull ? "font-semibold text-danger-700" : "text-ink-muted",
                      )}
                    >
                      {formatSeatsLeft(departure)}
                    </span>
                  </span>
                  <span className={cn("font-bold", departure.isSoldOut ? "text-ink-muted" : "text-accent-700")}>
                    {formatVND(departure.price)}
                  </span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {showSeats && selected ? (
          <FieldDescription id={seatsId} className="font-semibold text-danger-700">
            {formatSeatsLeft(selected)}
          </FieldDescription>
        ) : null}
        <FieldError id={errorId} errors={[errors.departureId]} />
      </Field>

      <div>
        <CounterRow
          label="Số khách"
          hint={`Tối đa ${maxGuests} khách`}
          value={guests}
          min={1}
          max={maxGuests}
          onChange={(next) => setValue("guests", next, { shouldValidate: isSubmitted, shouldDirty: true })}
        />
        <FieldError className="mt-2" errors={[errors.guests]} />
      </div>
    </div>
  );
}
