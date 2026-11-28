"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormProvider, useForm, useFormContext, useWatch, type FieldPath } from "react-hook-form";
import { toast } from "sonner";
import { FormError } from "@/components/auth/FormError";
import { BookingSteps } from "@/components/booking/BookingSteps";
import { bookingInputClass, ContactFields, NoteField } from "@/components/booking/ContactFields";
import { ContactReview, ReviewSection, reviewRowClass } from "@/components/booking/ReviewSection";
import { useBookingStep } from "@/components/booking/use-booking-step";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createHotelBookingAction } from "@/lib/actions/hotel-booking";
import type { SessionUser } from "@/lib/auth/user";
import { computeStayTotal, countNights } from "@/lib/data/hotel-view";
import { formatDate, formatVND } from "@/lib/format";
import { BOOKING_STEPS, type BookingStep } from "@/lib/schemas/booking";
import {
  buildHotelDetailHref,
  buildHotelStaySearch,
  hotelBookingFormSchema,
  type HotelBookingFormValues,
  type HotelStayValues,
} from "@/lib/schemas/hotel-booking";
import type { HotelRoomTypeView } from "@/lib/types";
import { HotelBookingSummaryCard, type BookingHotel } from "./HotelBookingSummaryCard";

const STEP_TITLES: Record<BookingStep, string> = {
  "thong-tin": "Thông tin người liên hệ và người nhận phòng",
  "xac-nhan": "Xác nhận đặt phòng",
};

const DETAIL_FIELDS = ["contact", "guestName", "note"] as const;
/** Lỗi server về lựa chọn lưu trú (không có ô trên trang này) hiện thành lỗi chung ở đầu form. */
const STAY_FIELDS: readonly string[] = ["roomTypeId", "checkIn", "checkOut", "guests", "rooms"];

/**
 * Luồng đặt phòng 2 bước ("Thông tin" → "Xác nhận"), MỘT form React Hook Form cho cả 2 bước. `HotelBookingGate` (server)
 * đảm bảo tới được đây thì đã đăng nhập và lựa chọn lưu trú trên URL đặt được.
 *
 * Lựa chọn lưu trú KHÔNG nằm trong form mà đến từ props (server đọc URL): khách đổi lựa chọn ở trang chi tiết rồi bấm
 * "Đặt phòng" lần nữa thì Next dùng lại component này với props mới, thông tin đã nhập vẫn giữ — không cần đồng bộ
 * form theo URL như wizard tour. Bước nằm trên URL (`useBookingStep`).
 */
export function HotelBookingWizard({
  hotel,
  room,
  stay,
  user,
}: {
  hotel: BookingHotel;
  room: HotelRoomTypeView;
  stay: HotelStayValues;
  user: SessionUser;
}) {
  const router = useRouter();
  const selection = {
    room: stay.roomTypeId,
    checkIn: stay.checkIn,
    checkOut: stay.checkOut,
    guests: stay.guests,
    rooms: stay.rooms,
  };
  const changeHref = buildHotelDetailHref(hotel.slug, selection);

  const form = useForm<HotelBookingFormValues>({
    resolver: zodResolver(hotelBookingFormSchema),
    defaultValues: {
      contact: { fullName: user.name, email: user.email, phone: user.phone ?? "" },
      // Thường người đặt cũng là người nhận phòng; khách sửa được khi đặt hộ.
      guestName: user.name,
      note: "",
    },
  });
  const { getValues, trigger, setError, handleSubmit, formState } = form;

  const { step, goTo, headingRef } = useBookingStep({
    isDetailsValid: hotelBookingFormSchema.safeParse(getValues()).success,
    buildSearch: (target) => buildHotelStaySearch(selection, target),
  });

  async function continueFromDetails() {
    const valid = await trigger([...DETAIL_FIELDS], { shouldFocus: true });
    if (valid) goTo("xac-nhan");
  }

  const submit = handleSubmit(
    async (values) => {
      const result = await createHotelBookingAction({ ...values, ...stay, hotelSlug: hotel.slug });
      if (result.ok) {
        toast.success("Đặt phòng thành công", {
          description: `Mã đơn của bạn: ${result.code}.`,
        });
        router.push(result.redirectTo);
        return;
      }
      const fieldErrors = Object.entries(result.fieldErrors ?? {});
      const stayMessages = fieldErrors.filter(([field]) => STAY_FIELDS.includes(field)).map(([, message]) => message);
      const detailErrors = fieldErrors.filter(([field]) => !STAY_FIELDS.includes(field));
      for (const [field, message] of detailErrors) setError(field as FieldPath<HotelBookingFormValues>, { message });
      const rootMessage = [result.message, ...stayMessages].filter(Boolean).join(" ");
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
          <BookingSteps current={step} label="Các bước đặt phòng" />

          <div>
            <p className="text-sm font-semibold text-primary-800">
              Bước {stepIndex + 1}/{BOOKING_STEPS.length}
            </p>
            <h2 ref={headingRef} tabIndex={-1} className="mt-1 scroll-mt-24 text-2xl font-bold text-ink outline-none">
              {STEP_TITLES[step]}
            </h2>
          </div>

          <FormError message={formState.errors.root?.server?.message} />

          {step === "thong-tin" ? <HotelStepDetails /> : null}
          {step === "xac-nhan" ? (
            <HotelStepReview
              hotel={hotel}
              room={room}
              stay={stay}
              onEditStay={() => router.push(changeHref)}
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
                {formState.isSubmitting ? "Đang đặt phòng..." : "Xác nhận đặt phòng"}
              </Button>
            )}
          </div>
        </form>
      </FormProvider>

      <HotelBookingSummaryCard
        hotel={hotel}
        room={room}
        stay={stay}
        changeHref={formState.isSubmitting ? undefined : changeHref}
      />
    </div>
  );
}

/** Bước "Thông tin": người liên hệ, người nhận phòng, ghi chú. */
function HotelStepDetails() {
  const {
    register,
    formState: { errors },
  } = useFormContext<HotelBookingFormValues>();

  return (
    <div className="space-y-8">
      <ContactFields description="GoTrips liên hệ qua email và số điện thoại này để xác nhận đặt phòng." />

      <FieldSet>
        <FieldLegend className="text-lg font-bold text-ink">Người nhận phòng</FieldLegend>
        <FieldDescription>Họ tên như trên giấy tờ tuỳ thân, xuất trình ở quầy lễ tân khi nhận phòng.</FieldDescription>
        <Field data-invalid={errors.guestName ? true : undefined}>
          <FieldLabel htmlFor="booking-guest-name">Họ và tên</FieldLabel>
          <Input
            id="booking-guest-name"
            autoComplete="off"
            className={bookingInputClass}
            aria-invalid={errors.guestName ? true : undefined}
            aria-describedby={errors.guestName ? "booking-guest-name-loi" : undefined}
            {...register("guestName")}
          />
          <FieldError id="booking-guest-name-loi" errors={[errors.guestName]} />
        </Field>
      </FieldSet>

      <NoteField placeholder="Ví dụ: nhận phòng muộn, cần giường phụ, phòng không hút thuốc..." />
    </div>
  );
}

/** Bước "Xác nhận": xem lại kỳ lưu trú, người liên hệ, người nhận phòng trước khi gửi. */
function HotelStepReview({
  hotel,
  room,
  stay,
  onEditStay,
  onEditDetails,
}: {
  hotel: BookingHotel;
  room: HotelRoomTypeView;
  stay: HotelStayValues;
  onEditStay: () => void;
  onEditDetails: () => void;
}) {
  const { control } = useFormContext<HotelBookingFormValues>();
  const [contact, guestName, note] = useWatch({ control, name: ["contact", "guestName", "note"] });
  const nights = countNights(stay.checkIn, stay.checkOut);

  return (
    <div className="space-y-4">
      <ReviewSection title="Kỳ lưu trú" editLabel="Đổi phòng hoặc ngày" onEdit={onEditStay}>
        <dl className="space-y-2 text-sm">
          <div className={reviewRowClass}>
            <dt className="text-ink-muted">Khách sạn</dt>
            <dd className="font-medium text-ink">{hotel.name}</dd>
          </div>
          <div className={reviewRowClass}>
            <dt className="text-ink-muted">Phòng</dt>
            <dd className="font-medium text-ink">
              {stay.rooms} × {room.name} ({room.bedType})
            </dd>
          </div>
          <div className={reviewRowClass}>
            <dt className="text-ink-muted">Nhận – trả phòng</dt>
            <dd className="font-medium text-ink">
              <time dateTime={stay.checkIn}>{formatDate(stay.checkIn)}</time> –{" "}
              <time dateTime={stay.checkOut}>{formatDate(stay.checkOut)}</time> ({nights} đêm)
            </dd>
          </div>
          <div className={reviewRowClass}>
            <dt className="text-ink-muted">Số khách</dt>
            <dd className="font-medium text-ink">{stay.guests}</dd>
          </div>
          <div className={reviewRowClass}>
            <dt className="text-ink-muted">Tổng tiền (tạm tính)</dt>
            <dd className="font-bold text-accent-700">
              {formatVND(computeStayTotal(room.pricePerNight, nights, stay.rooms))}
            </dd>
          </div>
        </dl>
      </ReviewSection>

      <ContactReview contact={contact} note={note} onEdit={onEditDetails} />

      <ReviewSection title="Người nhận phòng" editLabel="Sửa người nhận" onEdit={onEditDetails}>
        <p className="text-sm font-medium text-ink">{guestName}</p>
      </ReviewSection>
    </div>
  );
}
