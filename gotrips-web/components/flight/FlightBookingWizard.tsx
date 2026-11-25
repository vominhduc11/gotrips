"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  Controller,
  FormProvider,
  useFieldArray,
  useForm,
  useFormContext,
  useWatch,
  type FieldPath,
  type Resolver,
} from "react-hook-form";
import { toast } from "sonner";
import { FormError } from "@/components/auth/FormError";
import { BirthDatePicker } from "@/components/booking/BirthDatePicker";
import { BookingSteps } from "@/components/booking/BookingSteps";
import { bookingInputClass, ContactFields, NoteField } from "@/components/booking/ContactFields";
import { ContactReview, ReviewSection, reviewRowClass } from "@/components/booking/ReviewSection";
import { useBookingStep } from "@/components/booking/use-booking-step";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createFlightBookingAction } from "@/lib/actions/flight-booking";
import type { SessionUser } from "@/lib/auth/user";
import { computeFlightTotal, PASSENGER_TYPE_LABEL, SEGMENT_LABELS } from "@/lib/data/flight-view";
import { formatDate, formatVND } from "@/lib/format";
import { BOOKING_STEPS, type BookingStep } from "@/lib/schemas/booking";
import {
  buildFlightBookingSearch,
  buildFlightResultsHref,
  createFlightBookingFormSchema,
  passengerTypesFor,
  type FlightBookingFormValues,
  type FlightSelection,
} from "@/lib/schemas/flight-booking";
import { cabinLabel, type FlightSearchValues } from "@/lib/schemas/flight-search";
import type { FlightOptionView, PassengerType } from "@/lib/types";
import { FlightBookingSummaryCard } from "./FlightBookingSummaryCard";

const STEP_TITLES: Record<BookingStep, string> = {
  "thong-tin": "Thông tin người liên hệ và hành khách",
  "xac-nhan": "Xác nhận đặt vé",
};

const DETAIL_FIELDS = ["contact", "passengers", "note"] as const;
/** Lỗi server về lượt tìm / chuyến đã chọn (không có ô trên trang này) hiện thành lỗi chung ở đầu form. */
const isTripField = (field: string) =>
  field.startsWith("search.") || field === "outboundId" || field === "returnId" || field === "passengers";

const PASSENGER_HINT: Record<PassengerType, string> = {
  adult: "Từ 12 tuổi",
  child: "Từ 2 đến dưới 12 tuổi vào ngày bay",
  infant: "Dưới 2 tuổi vào ngày bay, ngồi cùng người lớn",
};

/** Danh sách hành khách cho đúng các loại `types`, giữ lại thông tin đã nhập ở vị trí cùng loại. */
function resizePassengers(current: FlightBookingFormValues["passengers"], types: PassengerType[]) {
  return types.map((type, index) => {
    const previous = current[index];
    return previous && previous.type === type ? previous : { type, fullName: "", dateOfBirth: "" };
  });
}

/**
 * Luồng đặt vé 2 bước ("Thông tin" → "Xác nhận"), MỘT form React Hook Form cho cả 2 bước. `FlightBookingGate` (server)
 * đảm bảo tới được đây thì đã đăng nhập và các chuyến trên URL đặt được.
 *
 * Lượt tìm + chuyến đã chọn đến từ props (server đọc URL), không nằm trong form. Khi khách quay lại trang kết quả rồi
 * chọn chuyến khác, Next dùng lại component này với props mới: thông tin đã nhập giữ nguyên, riêng danh sách hành khách
 * tự khớp lại theo số người lớn / trẻ em / em bé của lượt tìm mới (effect bên dưới).
 */
export function FlightBookingWizard({
  search,
  selection,
  segments,
  user,
}: {
  search: FlightSearchValues;
  selection: FlightSelection;
  segments: FlightOptionView[];
  user: SessionUser;
}) {
  const router = useRouter();
  const changeHref = buildFlightResultsHref(search, { out: selection.out });
  const types = passengerTypesFor(search);
  const typesKey = types.join(",");

  // Tuổi hành khách tính theo ngày bay; resolver đọc qua ref để luôn dùng ngày bay của props mới nhất.
  const departDateRef = useRef(search.departDate);
  useEffect(() => {
    departDateRef.current = search.departDate;
  }, [search.departDate]);

  const form = useForm<FlightBookingFormValues>({
    resolver: ((values, context, options) =>
      zodResolver(createFlightBookingFormSchema(departDateRef.current))(
        values,
        context,
        options,
      )) as Resolver<FlightBookingFormValues>,
    defaultValues: {
      contact: { fullName: user.name, email: user.email, phone: "" },
      // Hành khách đầu tiên (người lớn) điền sẵn là chính người đặt — trường hợp phổ biến nhất; khách sửa được.
      passengers: types.map((type, index) => ({
        type,
        fullName: index === 0 ? user.name : "",
        dateOfBirth: "",
      })),
      note: "",
    },
  });
  const { control, getValues, setValue, trigger, setError, clearErrors, handleSubmit, formState } = form;
  const { fields } = useFieldArray({ control, name: "passengers" });

  // Lượt tìm đổi số hành khách (component được dùng lại với props mới) → danh sách hành khách theo lượt tìm mới.
  useEffect(() => {
    const current = getValues("passengers");
    if (current.map((p) => p.type).join(",") === typesKey) return;
    setValue("passengers", resizePassengers(current, types));
    clearErrors("passengers");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chạy khi loại hành khách đổi
  }, [typesKey]);

  const { step, goTo, headingRef } = useBookingStep({
    isDetailsValid: createFlightBookingFormSchema(search.departDate).safeParse(getValues()).success,
    buildSearch: (target) => buildFlightBookingSearch(search, selection, target),
  });

  async function continueFromDetails() {
    const valid = await trigger([...DETAIL_FIELDS], { shouldFocus: true });
    if (valid) goTo("xac-nhan");
  }

  const submit = handleSubmit(
    async (values) => {
      const result = await createFlightBookingAction({
        ...values,
        search,
        outboundId: selection.out ?? 0,
        returnId: selection.ret ?? 0,
      });
      if (result.ok) {
        toast.success("Đặt vé thành công", {
          description: `Mã đơn của bạn: ${result.code}. Đây là bản thử nghiệm, chưa thu tiền thật.`,
        });
        router.push(result.redirectTo);
        return;
      }
      const fieldErrors = Object.entries(result.fieldErrors ?? {});
      const tripMessages = fieldErrors.filter(([field]) => isTripField(field)).map(([, message]) => message);
      const detailErrors = fieldErrors.filter(([field]) => !isTripField(field));
      for (const [field, message] of detailErrors) setError(field as FieldPath<FlightBookingFormValues>, { message });
      const rootMessage = [result.message, ...tripMessages].filter(Boolean).join(" ");
      if (rootMessage) setError("root.server", { message: rootMessage });
      if (detailErrors.length > 0) goTo("thong-tin");
    },
    () => goTo("thong-tin"),
  );

  const stepIndex = BOOKING_STEPS.findIndex((s) => s.value === step);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-start">
      <FormProvider {...form}>
        <form
          // Nhấn Enter ở bước "Thông tin" chỉ là "Tiếp tục", chưa tạo đơn.
          onSubmit={(event) => {
            if (step === "xac-nhan") return submit(event);
            event.preventDefault();
            void continueFromDetails();
          }}
          noValidate
          className="min-w-0 space-y-6"
        >
          <BookingSteps current={step} label="Các bước đặt vé" />

          <div>
            <p className="text-sm font-semibold text-primary-800">
              Bước {stepIndex + 1}/{BOOKING_STEPS.length}
            </p>
            <h2 ref={headingRef} tabIndex={-1} className="mt-1 scroll-mt-24 text-2xl font-bold text-ink outline-none">
              {STEP_TITLES[step]}
            </h2>
          </div>

          <FormError message={formState.errors.root?.server?.message} />

          {step === "thong-tin" ? <FlightStepDetails passengerIds={fields.map((f) => f.id)} /> : null}
          {step === "xac-nhan" ? (
            <FlightStepReview
              search={search}
              segments={segments}
              onEditFlights={() => router.push(changeHref)}
              onEditDetails={() => goTo("thong-tin")}
            />
          ) : null}

          <div className="flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:justify-between">
            {step === "xac-nhan" ? (
              <Button variant="outline" size="lg" disabled={formState.isSubmitting} onClick={() => goTo("thong-tin")}>
                <ArrowLeft aria-hidden="true" className="size-5" />
                Quay lại
              </Button>
            ) : (
              <span />
            )}

            {step === "thong-tin" ? (
              <Button size="lg" onClick={continueFromDetails}>
                Tiếp tục
                <ArrowRight aria-hidden="true" className="size-5" />
              </Button>
            ) : (
              <Button
                type="submit"
                variant="accent"
                size="lg"
                disabled={formState.isSubmitting}
                aria-busy={formState.isSubmitting}
              >
                {formState.isSubmitting ? (
                  <LoaderCircle aria-hidden="true" className="size-5 animate-spin motion-reduce:animate-none" />
                ) : null}
                {formState.isSubmitting ? "Đang đặt vé..." : "Xác nhận đặt vé"}
              </Button>
            )}
          </div>
        </form>
      </FormProvider>

      <FlightBookingSummaryCard
        search={search}
        segments={segments}
        changeHref={formState.isSubmitting ? undefined : changeHref}
      />
    </div>
  );
}

/** Bước "Thông tin": người liên hệ, từng hành khách (họ tên + ngày sinh), ghi chú. */
function FlightStepDetails({ passengerIds }: { passengerIds: string[] }) {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<FlightBookingFormValues>();
  const passengers = useWatch({ control, name: "passengers" });

  return (
    <div className="space-y-8">
      <ContactFields description="GoTrips gửi vé điện tử và thông báo thay đổi chuyến bay qua email, số điện thoại này." />

      <FieldSet>
        <FieldLegend className="text-lg font-bold text-ink">Hành khách ({passengers.length})</FieldLegend>
        <FieldDescription>
          Họ tên như trên căn cước công dân / hộ chiếu (giấy khai sinh với trẻ em). Trẻ em và em bé cần ngày sinh để
          kiểm tra độ tuổi.
        </FieldDescription>
        <ol className="space-y-4">
          {passengers.map((passenger, index) => {
            const passengerErrors = errors.passengers?.[index];
            const nameId = `booking-passenger-${index}-name`;
            const dobId = `booking-passenger-${index}-dob`;
            const dobRequired = passenger.type !== "adult";
            return (
              <li key={passengerIds[index] ?? index} className="rounded-card border border-line bg-surface p-4">
                <p className="mb-3 font-semibold text-ink">
                  Hành khách {index + 1} · {PASSENGER_TYPE_LABEL[passenger.type]}{" "}
                  <span className="text-sm font-normal text-ink-muted">({PASSENGER_HINT[passenger.type]})</span>
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field data-invalid={passengerErrors?.fullName ? true : undefined}>
                    <FieldLabel htmlFor={nameId}>Họ và tên</FieldLabel>
                    <Input
                      id={nameId}
                      autoComplete="off"
                      className={bookingInputClass}
                      aria-invalid={passengerErrors?.fullName ? true : undefined}
                      aria-describedby={passengerErrors?.fullName ? `${nameId}-loi` : undefined}
                      {...register(`passengers.${index}.fullName`)}
                    />
                    <FieldError id={`${nameId}-loi`} errors={[passengerErrors?.fullName]} />
                  </Field>
                  <Field data-invalid={passengerErrors?.dateOfBirth ? true : undefined}>
                    <FieldLabel id={`${dobId}-label`} htmlFor={dobId}>
                      Ngày sinh{" "}
                      {dobRequired ? null : <span className="font-normal text-ink-muted">(không bắt buộc)</span>}
                    </FieldLabel>
                    <Controller
                      control={control}
                      name={`passengers.${index}.dateOfBirth`}
                      render={({ field }) => (
                        <BirthDatePicker
                          ref={field.ref}
                          id={dobId}
                          labelId={`${dobId}-label`}
                          value={field.value}
                          onChange={field.onChange}
                          invalid={!!passengerErrors?.dateOfBirth}
                          describedBy={passengerErrors?.dateOfBirth ? `${dobId}-loi` : undefined}
                        />
                      )}
                    />
                    <FieldError id={`${dobId}-loi`} errors={[passengerErrors?.dateOfBirth]} />
                  </Field>
                </div>
              </li>
            );
          })}
        </ol>
      </FieldSet>

      <NoteField placeholder="Ví dụ: cần hỗ trợ xe lăn, suất ăn chay, mang theo thú cưng..." />
    </div>
  );
}

/** Bước "Xác nhận": xem lại chuyến bay, người liên hệ, hành khách trước khi gửi. */
function FlightStepReview({
  search,
  segments,
  onEditFlights,
  onEditDetails,
}: {
  search: FlightSearchValues;
  segments: FlightOptionView[];
  onEditFlights: () => void;
  onEditDetails: () => void;
}) {
  const { control } = useFormContext<FlightBookingFormValues>();
  const [contact, passengers, note] = useWatch({ control, name: ["contact", "passengers", "note"] });

  return (
    <div className="space-y-4">
      <ReviewSection title="Chuyến bay" editLabel="Đổi chuyến bay" onEdit={onEditFlights}>
        <dl className="space-y-2 text-sm">
          {segments.map((segment, index) => (
            <div key={segment.scheduleId} className={reviewRowClass}>
              <dt className="text-ink-muted">{SEGMENT_LABELS[index]}</dt>
              <dd className="font-medium text-ink">
                <time dateTime={segment.date}>{formatDate(segment.date)}</time> · {segment.flightNumber}{" "}
                {segment.from.code} {segment.departTime} – {segment.to.code} {segment.arriveTime}
                {segment.arrivesNextDay ? " (+1 ngày)" : ""}
              </dd>
            </div>
          ))}
          <div className={reviewRowClass}>
            <dt className="text-ink-muted">Hạng ghế</dt>
            <dd className="font-medium text-ink">{cabinLabel(search.cabin)}</dd>
          </div>
          <div className={reviewRowClass}>
            <dt className="text-ink-muted">Tổng tiền (tạm tính)</dt>
            <dd className="font-bold text-accent-700">{formatVND(computeFlightTotal(segments, search))}</dd>
          </div>
        </dl>
      </ReviewSection>

      <ContactReview contact={contact} note={note} onEdit={onEditDetails} />

      <ReviewSection title={`Hành khách (${passengers.length})`} editLabel="Sửa hành khách" onEdit={onEditDetails}>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-ink">
          {passengers.map((passenger, index) => (
            <li key={index}>
              <span className="font-medium">{passenger.fullName}</span>
              <span className="text-ink-muted">
                {" "}
                · {PASSENGER_TYPE_LABEL[passenger.type]}
                {passenger.dateOfBirth ? ` · sinh ngày ${formatDate(passenger.dateOfBirth)}` : ""}
              </span>
            </li>
          ))}
        </ol>
      </ReviewSection>
    </div>
  );
}
