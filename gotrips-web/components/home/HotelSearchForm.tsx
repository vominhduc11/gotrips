"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarDays, MapPin, Search, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useMemo } from "react";
import { useForm, useWatch, type Path, type PathValue, type Resolver } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  buildHotelSearchParams,
  createHotelSearchSchema,
  HOTEL_MAX_GUESTS,
  HOTEL_MAX_ROOMS,
  type HotelSearchValues,
} from "@/lib/schemas/hotel-search";
import { CounterPopover } from "./CounterPopover";
import { CounterRow } from "./CounterRow";
import { DateRangePicker } from "./DatePickers";
import { focusFirstError } from "./focus-first-error";
import { OptionCombobox, type ComboboxOption } from "./OptionCombobox";
import { fieldLabelClass, fieldLabelIconClass } from "./search-field-styles";
import type { DestinationOption } from "./SearchForm";

const EMPTY_VALUES: HotelSearchValues = { destination: "", checkIn: "", checkOut: "", guests: 2, rooms: 1 };

/**
 * Form tìm khách sạn: tab "Khách sạn" của ô tìm kiếm ở Trang chủ, và ô tìm kiếm ở đầu trang `/hotels`.
 * Submit hợp lệ → `/hotels?destination&checkIn&checkOut&guests&rooms` (hợp đồng URL ở `lib/schemas/hotel-search.ts`).
 *
 * `initialValues`: lượt tìm đang hiển thị ở `/hotels` (trang đọc từ URL rồi truyền xuống). Form chỉ đọc giá trị này lúc
 * mount, nên trang phải đặt `key` theo lượt tìm để form dựng lại khi URL đổi (Next dùng lại component khi chỉ search
 * params đổi).
 *
 * Các ô là nút mở Popover chứ không phải `<input>`, nên giá trị đọc bằng `useWatch` và ghi bằng `setValue`
 * (không dùng `register`); lỗi lấy từ `formState.errors` do resolver Zod điền.
 */
export function HotelSearchForm({
  destinations,
  initialValues,
}: {
  destinations: DestinationOption[];
  initialValues?: HotelSearchValues;
}) {
  const router = useRouter();
  const uid = useId();
  const id = (name: string) => `${uid}-${name}`;

  const {
    control,
    handleSubmit,
    setValue,
    trigger,
    formState: { errors, isSubmitted },
  } = useForm<HotelSearchValues>({
    // Dựng schema MỖI LẦN validate (không phải lúc import) để "hôm nay" luôn đúng kể cả khi trang mở qua nửa đêm.
    resolver: ((values, context, options) =>
      zodResolver(createHotelSearchSchema())(values, context, options)) as Resolver<HotelSearchValues>,
    defaultValues: initialValues ?? EMPTY_VALUES,
  });

  const [destination, checkIn, checkOut, guests, rooms] = useWatch({
    control,
    name: ["destination", "checkIn", "checkOut", "guests", "rooms"],
  });

  /** Ghi giá trị; sau lần submit đầu thì validate lại cả form để lỗi chéo (ngày trả, phòng > khách) cập nhật ngay. */
  function update<N extends Path<HotelSearchValues>>(name: N, value: PathValue<HotelSearchValues, N>) {
    setValue(name, value, { shouldDirty: true });
    if (isSubmitted) void trigger();
  }

  const options = useMemo<ComboboxOption[]>(
    () =>
      destinations.map((d) => ({
        value: d.slug,
        label: d.name,
        description: d.region,
        keywords: [d.name, d.region, d.slug],
      })),
    [destinations],
  );

  // Một ô lịch chung cho cả ngày nhận và ngày trả nên gom lỗi của cả hai.
  const dateErrors = [errors.checkIn, errors.checkOut];
  const hasDateError = dateErrors.some(Boolean);
  const guestErrors = [errors.guests, errors.rooms];
  const hasGuestError = guestErrors.some(Boolean);

  function onValid(values: HotelSearchValues) {
    router.push(`/hotels?${buildHotelSearchParams(values)}`);
  }

  return (
    // noValidate: dùng thông báo lỗi tiếng Việt của Zod thay cho bong bóng theo ngôn ngữ trình duyệt.
    <form
      onSubmit={handleSubmit(onValid, (formErrors) =>
        focusFirstError(formErrors, [
          ["destination", id("destination")],
          ["checkIn", id("dates")],
          ["checkOut", id("dates")],
          ["guests", id("guests")],
          ["rooms", id("guests")],
        ]),
      )}
      noValidate
      aria-label="Tìm khách sạn"
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-[1.2fr_1.6fr_1fr_auto] lg:items-start">
        <Field className="gap-1.5" data-invalid={Boolean(errors.destination)}>
          <FieldLabel id={id("destination-label")} htmlFor={id("destination")} className={fieldLabelClass}>
            <MapPin aria-hidden="true" className={fieldLabelIconClass} />
            Điểm đến
          </FieldLabel>
          <OptionCombobox
            id={id("destination")}
            labelId={id("destination-label")}
            value={destination}
            onChange={(value) => update("destination", value)}
            options={options}
            placeholder="Bạn muốn ở đâu?"
            searchPlaceholder="Tìm thành phố, địa danh…"
            emptyText="Không tìm thấy điểm đến phù hợp."
            invalid={Boolean(errors.destination)}
            describedBy={errors.destination ? id("destination-error") : undefined}
          />
          <FieldError id={id("destination-error")} errors={[errors.destination]} />
        </Field>

        <Field className="gap-1.5" data-invalid={hasDateError}>
          <FieldLabel id={id("dates-label")} htmlFor={id("dates")} className={fieldLabelClass}>
            <CalendarDays aria-hidden="true" className={fieldLabelIconClass} />
            Ngày nhận – trả phòng
          </FieldLabel>
          <DateRangePicker
            id={id("dates")}
            labelId={id("dates-label")}
            from={checkIn}
            to={checkOut}
            onChange={(from, to) => {
              setValue("checkIn", from, { shouldDirty: true });
              update("checkOut", to);
            }}
            invalid={hasDateError}
            describedBy={hasDateError ? id("dates-error") : undefined}
          />
          <FieldError id={id("dates-error")} errors={dateErrors} />
        </Field>

        <Field className="gap-1.5" data-invalid={hasGuestError}>
          <FieldLabel id={id("guests-label")} htmlFor={id("guests")} className={fieldLabelClass}>
            <Users aria-hidden="true" className={fieldLabelIconClass} />
            Khách và phòng
          </FieldLabel>
          <CounterPopover
            id={id("guests")}
            labelId={id("guests-label")}
            summary={`${guests} khách · ${rooms} phòng`}
            invalid={hasGuestError}
            describedBy={hasGuestError ? id("guests-error") : undefined}
          >
            {/* Phòng không được nhiều hơn khách: giảm khách không xuống dưới số phòng, tăng phòng không vượt số khách. */}
            <CounterRow
              label="Khách"
              value={guests}
              min={Math.max(1, rooms)}
              max={HOTEL_MAX_GUESTS}
              onChange={(value) => update("guests", value)}
            />
            <CounterRow
              label="Phòng"
              value={rooms}
              min={1}
              max={Math.min(HOTEL_MAX_ROOMS, guests)}
              onChange={(value) => update("rooms", value)}
            />
          </CounterPopover>
          <FieldError id={id("guests-error")} errors={guestErrors} />
        </Field>

        {/* Căn nút với hàng ô nhập (bỏ phần nhãn ở lg). */}
        <div className="md:col-span-2 lg:col-span-1 lg:pt-[1.625rem]">
          <Button type="submit" variant="accent" size="lg" className="w-full">
            <Search aria-hidden="true" className="size-5" />
            Tìm khách sạn
          </Button>
        </div>
      </div>
    </form>
  );
}
