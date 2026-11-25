"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarDays, MapPin, Search, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useMemo } from "react";
import { useForm, useWatch, type Path, type PathValue } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { searchSchema, TOUR_MAX_GUESTS, type SearchFormValues } from "@/lib/schemas/search";
import { CounterPopover } from "./CounterPopover";
import { CounterRow } from "./CounterRow";
import { DatePicker } from "./DatePickers";
import { focusFirstError } from "./focus-first-error";
import { OptionCombobox, type ComboboxOption } from "./OptionCombobox";
import { fieldLabelClass, fieldLabelIconClass } from "./search-field-styles";

export interface DestinationOption {
  slug: string;
  name: string;
  region: string;
}

/**
 * Form tìm tour (tab "Tour" của ô tìm kiếm Trang chủ). Submit → `/tours?destination=<slug>&date=<yyyy-mm-dd>&guests=<n>`,
 * tham số trống thì bỏ khỏi URL. Trang /tours đọc các tham số này (schema ở `lib/schemas/tour-filters.ts`).
 *
 * Dùng cùng bộ ô với tab Khách sạn / Vé máy bay (combobox có tìm kiếm, lịch shadcn, Popover chỉnh số lượng) thay cho
 * `<datalist>` / `type="date"` / `type="number"` gốc trình duyệt — vốn hiện giao diện khác nhau theo từng trình duyệt.
 * Các ô là nút mở Popover nên giá trị đọc bằng `useWatch` và ghi bằng `setValue`.
 *
 * Ba `<input type="hidden">` đăng ký với React Hook Form mang đúng tên tham số URL của /tours: nếu khách bấm "Tìm tour"
 * trước khi JS hydrate xong, trình duyệt vẫn gửi form GET tới /tours với giá trị đang có. React Hook Form chỉ ghi giá trị
 * mặc định vào các ô này khi đã commit, nên e2e dùng `input[name="guests"]` = "2" làm dấu hiệu "đã hydrate".
 */
export function SearchForm({ destinations }: { destinations: DestinationOption[] }) {
  const router = useRouter();
  const uid = useId();
  const id = (name: string) => `${uid}-${name}`;

  const {
    control,
    register,
    handleSubmit,
    setValue,
    trigger,
    formState: { errors, isSubmitted },
  } = useForm<SearchFormValues>({
    resolver: zodResolver(searchSchema),
    defaultValues: { destination: "", date: "", guests: 2 },
  });

  const [destination, date, guests] = useWatch({ control, name: ["destination", "date", "guests"] });

  /** Ghi giá trị; sau lần submit đầu thì validate lại để lỗi biến mất ngay khi sửa. */
  function update<N extends Path<SearchFormValues>>(name: N, value: PathValue<SearchFormValues, N>) {
    setValue(name, value, { shouldDirty: true });
    if (isSubmitted) void trigger(name);
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

  function onValid(values: SearchFormValues) {
    const params = new URLSearchParams();
    if (values.destination) params.set("destination", values.destination);
    if (values.date) params.set("date", values.date);
    params.set("guests", String(values.guests));

    router.push(`/tours?${params.toString()}`);
  }

  return (
    // noValidate: dùng thông báo lỗi tiếng Việt của Zod thay cho bong bóng theo ngôn ngữ trình duyệt.
    <form
      action="/tours"
      method="get"
      onSubmit={handleSubmit(onValid, (formErrors) =>
        focusFirstError(formErrors, [
          ["destination", id("destination")],
          ["date", id("date")],
          ["guests", id("guests")],
        ]),
      )}
      noValidate
      aria-label="Tìm tour"
    >
      <input type="hidden" {...register("destination")} />
      <input type="hidden" {...register("date")} />
      <input type="hidden" {...register("guests")} />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_0.8fr_auto] lg:items-start">
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
            placeholder="Bạn muốn đi đâu?"
            searchPlaceholder="Tìm thành phố, địa danh…"
            emptyText="Không tìm thấy điểm đến phù hợp."
            invalid={Boolean(errors.destination)}
            describedBy={errors.destination ? id("destination-error") : undefined}
          />
          <FieldError id={id("destination-error")} errors={[errors.destination]} />
        </Field>

        <Field className="gap-1.5" data-invalid={Boolean(errors.date)}>
          <FieldLabel id={id("date-label")} htmlFor={id("date")} className={fieldLabelClass}>
            <CalendarDays aria-hidden="true" className={fieldLabelIconClass} />
            Ngày khởi hành
          </FieldLabel>
          <DatePicker
            id={id("date")}
            labelId={id("date-label")}
            value={date}
            onChange={(value) => update("date", value)}
            placeholder="Ngày bất kỳ"
            invalid={Boolean(errors.date)}
            describedBy={errors.date ? id("date-error") : undefined}
          />
          <FieldError id={id("date-error")} errors={[errors.date]} />
        </Field>

        <Field className="gap-1.5" data-invalid={Boolean(errors.guests)}>
          <FieldLabel id={id("guests-label")} htmlFor={id("guests")} className={fieldLabelClass}>
            <Users aria-hidden="true" className={fieldLabelIconClass} />
            Số khách
          </FieldLabel>
          <CounterPopover
            id={id("guests")}
            labelId={id("guests-label")}
            summary={`${guests} khách`}
            invalid={Boolean(errors.guests)}
            describedBy={errors.guests ? id("guests-error") : undefined}
          >
            <CounterRow
              label="Khách"
              value={guests}
              min={1}
              max={TOUR_MAX_GUESTS}
              onChange={(value) => update("guests", value)}
            />
          </CounterPopover>
          <FieldError id={id("guests-error")} errors={[errors.guests]} />
        </Field>

        {/* Căn nút với hàng ô nhập (bỏ phần nhãn ở lg). */}
        <div className="md:col-span-2 lg:col-span-1 lg:pt-[1.625rem]">
          <Button type="submit" variant="accent" size="lg" className="w-full">
            <Search aria-hidden="true" className="size-5" />
            Tìm tour
          </Button>
        </div>
      </div>
    </form>
  );
}
