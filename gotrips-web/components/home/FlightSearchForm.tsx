"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeftRight,
  ArrowUpDown,
  CalendarDays,
  Plane,
  PlaneLanding,
  PlaneTakeoff,
  Search,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useMemo } from "react";
import { useForm, useWatch, type Path, type PathValue, type Resolver } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/cn";
import { summarizePassengers } from "@/lib/data/flight-view";
import {
  buildFlightSearchParams,
  CABIN_OPTIONS,
  createFlightPrefillSchema,
  createFlightSearchSchema,
  FLIGHT_MAX_PASSENGERS,
  TRIP_TYPE_OPTIONS,
  type CabinClass,
  type FlightSearchValues,
  type TripType,
} from "@/lib/schemas/flight-search";
import type { Airport } from "@/lib/types";
import { CounterPopover } from "./CounterPopover";
import { CounterRow } from "./CounterRow";
import { DatePicker } from "./DatePickers";
import { focusFirstError } from "./focus-first-error";
import { OptionCombobox, type ComboboxOption } from "./OptionCombobox";
import { fieldLabelClass, fieldLabelIconClass, fieldTriggerClass } from "./search-field-styles";
import { SERVICE_TAB_HASH } from "./service-tab-hash";
import { useSearchPrefill } from "./use-search-prefill";

/** Bề rộng của một ô trong hàng "ngày – hành khách – hạng ghế": 2 ô/hàng ở md, chia đều một hàng ở lg. */
const cellClass = "gap-1.5 md:basis-[calc(50%-0.5rem)] lg:flex-1 lg:basis-0";

const EMPTY_VALUES: FlightSearchValues = {
  tripType: "oneWay",
  from: "",
  to: "",
  departDate: "",
  returnDate: "",
  adults: 1,
  children: 0,
  infants: 0,
  cabin: "economy",
};

/**
 * Form tìm vé máy bay: tab "Vé máy bay" của ô tìm kiếm ở Trang chủ, và ô tìm kiếm ở đầu trang `/flights`.
 * Submit hợp lệ → `/flights?tripType&from&to&departDate&returnDate&adults&children&infants&cabin` (hợp đồng URL ở
 * `lib/schemas/flight-search.ts`).
 *
 * `initialValues`: lượt tìm đang hiển thị ở `/flights` (trang đọc từ URL). Form chỉ đọc lúc mount nên trang đặt `key`
 * theo lượt tìm để form dựng lại khi URL đổi.
 *
 * Các ô là nút mở Popover chứ không phải `<input>`, nên giá trị đọc bằng `useWatch` và ghi bằng `setValue`
 * (không dùng `register`); lỗi lấy từ `formState.errors` do resolver Zod điền.
 *
 * Điền sẵn: thẻ chặng bay gửi `{ from, to }` (mã IATA) qua sự kiện hash tới `prefillHash` (`useSearchPrefill`),
 * form chỉ ghi đè hai ô "Điểm đi"/"Điểm đến" — loại hành trình, ngày, hành khách, hạng ghế khách đã chọn vẫn giữ
 * nguyên. Hai mã phải có trong `airports` của form này và khác nhau, sai thì bỏ cả gói.
 */
export function FlightSearchForm({
  airports,
  prefillHash = SERVICE_TAB_HASH.flight,
  initialValues,
}: {
  airports: Airport[];
  /** Hash (không kèm `#`) mà thẻ chặng bay gửi gói điền sẵn tới. Mặc định: tab Vé máy bay ở Trang chủ. */
  prefillHash?: string;
  initialValues?: FlightSearchValues;
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
  } = useForm<FlightSearchValues>({
    // Dựng schema MỖI LẦN validate để "hôm nay" luôn đúng kể cả khi trang mở qua nửa đêm.
    resolver: ((values, context, options) =>
      zodResolver(createFlightSearchSchema())(values, context, options)) as Resolver<FlightSearchValues>,
    defaultValues: initialValues ?? EMPTY_VALUES,
  });

  const [tripType, from, to, departDate, returnDate, adults, children, infants, cabin] = useWatch({
    control,
    name: ["tripType", "from", "to", "departDate", "returnDate", "adults", "children", "infants", "cabin"],
  });
  const isRoundTrip = tripType === "roundTrip";

  /** Ghi giá trị; sau lần submit đầu thì validate lại cả form để lỗi chéo (điểm đi = điểm đến, ngày về...) cập nhật ngay. */
  function update<N extends Path<FlightSearchValues>>(name: N, value: PathValue<FlightSearchValues, N>) {
    setValue(name, value, { shouldDirty: true });
    if (isSubmitted) void trigger();
  }

  const options = useMemo<ComboboxOption[]>(
    () =>
      airports.map((airport) => ({
        value: airport.code,
        label: `${airport.city} (${airport.code})`,
        description: airport.name,
        keywords: [airport.city, airport.name, airport.code],
      })),
    [airports],
  );

  const prefillSchema = useMemo(() => createFlightPrefillSchema(airports.map((airport) => airport.code)), [airports]);
  useSearchPrefill({
    hash: prefillHash,
    schema: prefillSchema,
    apply: ({ from: fromCode, to: toCode }) => {
      setValue("from", fromCode, { shouldDirty: true });
      update("to", toCode);
    },
  });

  function swapAirports() {
    setValue("from", to, { shouldDirty: true });
    update("to", from);
  }

  function onValid(values: FlightSearchValues) {
    router.push(`/flights?${buildFlightSearchParams(values)}`);
  }

  // Các nút −/+ đã chặn tổ hợp vô lý (em bé ≤ người lớn, tổng ≤ 9); lỗi dưới đây là lớp bảo vệ của schema.
  const passengerErrors = [errors.adults, errors.children, errors.infants];
  const hasPassengerError = passengerErrors.some(Boolean);

  return (
    // noValidate: dùng thông báo lỗi tiếng Việt của Zod thay cho bong bóng theo ngôn ngữ trình duyệt.
    <form
      onSubmit={handleSubmit(onValid, (formErrors) =>
        focusFirstError(formErrors, [
          ["from", id("from")],
          ["to", id("to")],
          ["departDate", id("depart")],
          ["returnDate", id("return")],
          ["adults", id("passengers")],
          ["children", id("passengers")],
          ["infants", id("passengers")],
        ]),
      )}
      noValidate
      aria-label="Tìm vé máy bay"
      className="flex flex-col gap-4"
    >
      <RadioGroup
        aria-label="Loại hành trình"
        orientation="horizontal"
        value={tripType}
        onValueChange={(value) => update("tripType", value as TripType)}
        className="flex w-auto gap-6"
      >
        {TRIP_TYPE_OPTIONS.map((option) => (
          <div key={option.value} className="flex items-center gap-2">
            <RadioGroupItem id={id(`trip-${option.value}`)} value={option.value} />
            <Label htmlFor={id(`trip-${option.value}`)} className="cursor-pointer text-base font-semibold text-ink">
              {option.label}
            </Label>
          </div>
        ))}
      </RadioGroup>

      {/* Điểm đi — nút đổi chiều — điểm đến. Điện thoại: xếp dọc, nút đổi chiều nằm giữa hai ô. */}
      <div className="grid gap-2 md:grid-cols-[1fr_auto_1fr] md:items-start md:gap-3">
        <Field className="gap-1.5" data-invalid={Boolean(errors.from)}>
          <FieldLabel id={id("from-label")} htmlFor={id("from")} className={fieldLabelClass}>
            <PlaneTakeoff aria-hidden="true" className={fieldLabelIconClass} />
            Điểm đi
          </FieldLabel>
          <OptionCombobox
            id={id("from")}
            labelId={id("from-label")}
            value={from}
            onChange={(value) => update("from", value)}
            options={options}
            placeholder="Chọn sân bay đi"
            searchPlaceholder="Tìm thành phố hoặc mã sân bay…"
            emptyText="Không tìm thấy sân bay phù hợp."
            invalid={Boolean(errors.from)}
            describedBy={errors.from ? id("from-error") : undefined}
          />
          <FieldError id={id("from-error")} errors={[errors.from]} />
        </Field>

        <div className="flex justify-center md:pt-[1.625rem]">
          <Button
            variant="outline"
            size="icon"
            aria-label="Đổi chiều điểm đi và điểm đến"
            onClick={swapAirports}
            className="rounded-pill"
          >
            <ArrowUpDown aria-hidden="true" className="size-5 md:hidden" />
            <ArrowLeftRight aria-hidden="true" className="hidden size-5 md:block" />
          </Button>
        </div>

        <Field className="gap-1.5" data-invalid={Boolean(errors.to)}>
          <FieldLabel id={id("to-label")} htmlFor={id("to")} className={fieldLabelClass}>
            <PlaneLanding aria-hidden="true" className={fieldLabelIconClass} />
            Điểm đến
          </FieldLabel>
          <OptionCombobox
            id={id("to")}
            labelId={id("to-label")}
            value={to}
            onChange={(value) => update("to", value)}
            options={options}
            placeholder="Chọn sân bay đến"
            searchPlaceholder="Tìm thành phố hoặc mã sân bay…"
            emptyText="Không tìm thấy sân bay phù hợp."
            invalid={Boolean(errors.to)}
            describedBy={errors.to ? id("to-error") : undefined}
          />
          <FieldError id={id("to-error")} errors={[errors.to]} />
        </Field>
      </div>

      {/* Ngày, hành khách, hạng ghế, nút tìm: flex-wrap để số ô đổi theo một chiều/khứ hồi mà vẫn đều nhau. */}
      <div className="flex flex-col gap-4 md:flex-row md:flex-wrap lg:flex-nowrap lg:items-start">
        <Field className={cellClass} data-invalid={Boolean(errors.departDate)}>
          <FieldLabel id={id("depart-label")} htmlFor={id("depart")} className={fieldLabelClass}>
            <CalendarDays aria-hidden="true" className={fieldLabelIconClass} />
            Ngày đi
          </FieldLabel>
          <DatePicker
            id={id("depart")}
            labelId={id("depart-label")}
            value={departDate}
            onChange={(value) => {
              // Ngày về đã chọn mà nay nằm trước ngày đi mới → xoá để khách chọn lại, tránh giữ giá trị vô lý.
              if (returnDate && returnDate < value) setValue("returnDate", "", { shouldDirty: true });
              update("departDate", value);
            }}
            invalid={Boolean(errors.departDate)}
            describedBy={errors.departDate ? id("depart-error") : undefined}
          />
          <FieldError id={id("depart-error")} errors={[errors.departDate]} />
        </Field>

        {isRoundTrip ? (
          <Field className={cellClass} data-invalid={Boolean(errors.returnDate)}>
            <FieldLabel id={id("return-label")} htmlFor={id("return")} className={fieldLabelClass}>
              <CalendarDays aria-hidden="true" className={fieldLabelIconClass} />
              Ngày về
            </FieldLabel>
            <DatePicker
              id={id("return")}
              labelId={id("return-label")}
              value={returnDate}
              minDate={departDate || undefined}
              onChange={(value) => update("returnDate", value)}
              invalid={Boolean(errors.returnDate)}
              describedBy={errors.returnDate ? id("return-error") : undefined}
            />
            <FieldError id={id("return-error")} errors={[errors.returnDate]} />
          </Field>
        ) : null}

        <Field className={cellClass} data-invalid={hasPassengerError}>
          <FieldLabel id={id("passengers-label")} htmlFor={id("passengers")} className={fieldLabelClass}>
            <Users aria-hidden="true" className={fieldLabelIconClass} />
            Hành khách
          </FieldLabel>
          <CounterPopover
            id={id("passengers")}
            labelId={id("passengers-label")}
            summary={summarizePassengers(adults, children, infants)}
            invalid={hasPassengerError}
            describedBy={hasPassengerError ? id("passengers-error") : undefined}
          >
            <CounterRow
              label="Người lớn"
              hint="Từ 12 tuổi"
              value={adults}
              // Không giảm xuống dưới số em bé (mỗi em bé cần một người lớn đi cùng).
              min={Math.max(1, infants)}
              max={FLIGHT_MAX_PASSENGERS - children - infants}
              onChange={(value) => update("adults", value)}
            />
            <CounterRow
              label="Trẻ em"
              hint="Từ 2 đến dưới 12 tuổi"
              value={children}
              min={0}
              max={FLIGHT_MAX_PASSENGERS - adults - infants}
              onChange={(value) => update("children", value)}
            />
            <CounterRow
              label="Em bé"
              hint="Dưới 2 tuổi, ngồi cùng người lớn"
              value={infants}
              min={0}
              max={Math.min(adults, FLIGHT_MAX_PASSENGERS - adults - children)}
              onChange={(value) => update("infants", value)}
            />
          </CounterPopover>
          <FieldError id={id("passengers-error")} errors={passengerErrors} />
        </Field>

        <Field className={cellClass}>
          <FieldLabel id={id("cabin-label")} htmlFor={id("cabin")} className={fieldLabelClass}>
            <Plane aria-hidden="true" className={fieldLabelIconClass} />
            Hạng ghế
          </FieldLabel>
          <Select value={cabin} onValueChange={(value) => update("cabin", value as CabinClass)}>
            <SelectTrigger
              id={id("cabin")}
              aria-labelledby={`${id("cabin-label")} ${id("cabin")}`}
              className={cn(fieldTriggerClass, "rounded-control py-0 pl-3 pr-3 data-[size=default]:h-12")}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" align="start">
              {CABIN_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value} className="py-2 text-base">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {/* Căn nút với hàng ô nhập (bỏ phần nhãn ở lg). */}
        <div className="md:basis-full lg:basis-auto lg:pt-[1.625rem]">
          <Button type="submit" variant="accent" size="lg" className="w-full lg:min-w-40">
            <Search aria-hidden="true" className="size-5" />
            Tìm chuyến bay
          </Button>
        </div>
      </div>
    </form>
  );
}
