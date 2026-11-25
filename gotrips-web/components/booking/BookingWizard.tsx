"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, LoaderCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FormProvider, useFieldArray, useForm, useWatch, type FieldPath, type Resolver } from "react-hook-form";
import { toast } from "sonner";
import { FormError } from "@/components/auth/FormError";
import { Button } from "@/components/ui/button";
import { createBookingAction } from "@/lib/actions/booking";
import type { SessionUser } from "@/lib/auth/user";
import { normalizeBookingSelection, resolveBookingStep } from "@/lib/booking/steps";
import {
  BOOKING_STEPS,
  buildBookingSearch,
  createBookingFormSchema,
  parseBookingParams,
  type BookingFormValues,
  type BookingStep,
  type TripSelectionValues,
} from "@/lib/schemas/booking";
import type { TourDepartureView } from "@/lib/types";
import { BookingSteps } from "./BookingSteps";
import { BookingSummaryCard, type BookingTour } from "./BookingSummaryCard";
import { ChangeTripDialog } from "./ChangeTripDialog";
import { StepDetails } from "./StepDetails";
import { StepReview } from "./StepReview";

const STEP_TITLES: Record<BookingStep, string> = {
  "thong-tin": "Thông tin người liên hệ và người đi",
  "xac-nhan": "Xác nhận đặt tour",
};

/** Các field của bước "Thông tin" — validate riêng trước khi sang "Xác nhận". */
const DETAIL_FIELDS = ["contact", "travelers", "note"] as const;
/** Field chuyến + số khách: không có ô trên trang này (đổi bằng hộp thoại), lỗi server về chúng hiện thành lỗi chung. */
const TRIP_FIELDS: readonly string[] = ["departureId", "guests"];

const emptyTraveler = () => ({ fullName: "", dateOfBirth: "" });

/**
 * Luồng đặt tour 2 bước ("Thông tin" → "Xác nhận"), MỘT form React Hook Form cho cả 2 bước (dữ liệu bước trước còn
 * nguyên khi sang bước sau). Ngày khởi hành và số khách đã chọn ở thẻ "Đặt tour" của trang chi tiết; ở đây chỉ đổi
 * được qua hộp thoại "Thay đổi" (`ChangeTripDialog`) để không mất thông tin đã nhập. `BookingGate` (server) đảm bảo
 * tới được đây thì đã đăng nhập và URL có chuyến còn đặt được.
 *
 * Bước hiện tại + chuyến + số khách nằm trên URL (`?departure&guests&step`). Chuyển bước dùng
 * `window.history.pushState` (Next đồng bộ với `useSearchParams` mà không điều hướng): nếu dùng `router.push`, page
 * segment được tạo lại theo search params mới và state của form mất. Nút Back của trình duyệt lùi đúng bước.
 * Thông tin cá nhân không lên URL — tải lại trang ở bước "Xác nhận" thì quay về bước "Thông tin" để nhập lại.
 *
 * URL là nguồn sự thật của chuyến + số khách. Lưu ý: khi khách rời trang rồi quay lại bằng đường khác (vd nút "Đặt
 * tour" ở trang chi tiết với `?departure=` mới), Next DÙNG LẠI component đang có thay vì mount mới, nên `defaultValues`
 * không được đọc lại — vì vậy form phải tự đồng bộ theo URL (effect bên dưới), không chỉ đọc URL lúc mount.
 */
export function BookingWizard({
  tour,
  departures,
  user,
}: {
  tour: BookingTour;
  departures: TourDepartureView[];
  user: SessionUser | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [tripDialogOpen, setTripDialogOpen] = useState(false);

  const bookable = departures.filter((d) => !d.isSoldOut);
  const urlParams = parseBookingParams(Object.fromEntries(searchParams.entries()));
  const urlSelection = normalizeBookingSelection(urlParams, departures);

  const form = useForm<BookingFormValues>({
    // "Hôm nay" (ngày sinh không được sau hôm nay) lấy lúc validate, không lúc render — như form khách sạn.
    resolver: ((values, context, options) =>
      zodResolver(createBookingFormSchema())(values, context, options)) as Resolver<BookingFormValues>,
    defaultValues: {
      departureId: urlSelection.departureId,
      guests: urlSelection.guests,
      contact: { fullName: user?.name ?? "", email: user?.email ?? "", phone: "" },
      // Điền sẵn người đi đầu tiên là chính người đặt — trường hợp phổ biến nhất; khách sửa được.
      travelers: Array.from({ length: urlSelection.guests }, (_, i) => ({
        fullName: i === 0 ? (user?.name ?? "") : "",
        dateOfBirth: "",
      })),
      note: "",
    },
  });
  const { control, getValues, setValue, trigger, setError, clearErrors, handleSubmit, formState } = form;
  const { fields: travelers, append, remove } = useFieldArray({ control, name: "travelers" });
  const [departureId, guests] = useWatch({ control, name: ["departureId", "guests"] });

  const selectedDeparture = bookable.find((d) => d.id === departureId);
  /** Form đã khớp lựa chọn trên URL chưa (chưa khớp = vừa điều hướng tới, effect đồng bộ bên dưới sắp chạy). */
  const inSyncWithUrl = departureId === urlSelection.departureId && guests === urlSelection.guests;
  const requestedStep = urlParams.step;
  const step = resolveBookingStep(requestedStep, {
    isDetailsValid: createBookingFormSchema().safeParse(getValues()).success,
  });

  function writeUrl(target: BookingStep, mode: "push" | "replace") {
    const search = buildBookingSearch({
      departure: getValues("departureId") || undefined,
      guests: getValues("guests"),
      step: target,
    });
    const url = search ? `?${search}` : window.location.pathname;
    if (mode === "push") window.history.pushState(null, "", url);
    else window.history.replaceState(null, "", url);
  }

  /** Số dòng "Người đi" luôn bằng số khách: thêm dòng trống hoặc bỏ các dòng cuối. */
  function resizeTravelers(next: number) {
    const count = getValues("travelers").length;
    if (next > count) append(Array.from({ length: next - count }, emptyTraveler), { shouldFocus: false });
    else if (next < count) remove(Array.from({ length: count - next }, (_, i) => count - 1 - i));
  }

  // URL đổi lựa chọn từ BÊN NGOÀI (nút "Đặt tour" ở trang chi tiết khi component được dùng lại, Back/Forward qua
  // mục lịch sử có chuyến khác) → form theo URL. Thay đổi do chính wizard ghi lên URL thì form và URL đã khớp, không làm gì.
  // Chỉ đổi chuyến và số khách; người liên hệ, người đi đã nhập vẫn giữ.
  // Phải khai báo TRƯỚC effect sửa URL bên dưới (effect chạy theo thứ tự khai báo).
  useEffect(() => {
    if (inSyncWithUrl) return;
    setValue("departureId", urlSelection.departureId);
    setValue("guests", urlSelection.guests);
    resizeTravelers(urlSelection.guests);
    clearErrors(["departureId", "guests"]);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chạy khi lựa chọn trên URL đổi
  }, [urlSelection.departureId, urlSelection.guests]);

  // URL đòi bước chưa được phép (gõ tay, tải lại trang) → sửa URL cho khớp bước đang hiển thị. Đợi form khớp URL
  // trước, nếu không sẽ ghi lựa chọn CŨ của form đè lên lựa chọn mới trên URL.
  useEffect(() => {
    if (inSyncWithUrl && step !== requestedStep) writeUrl(step, "replace");
  });

  // Chuyển bước thì đưa focus tới tiêu đề bước mới (trình đọc màn hình đọc tiêu đề, bàn phím bắt đầu từ đầu bước).
  // Bỏ qua lần render đầu để không cướp focus khi vừa mở trang.
  const previousStep = useRef(step);
  useEffect(() => {
    if (previousStep.current === step) return;
    previousStep.current = step;
    headingRef.current?.focus();
  }, [step]);

  /**
   * Áp lựa chọn mới từ hộp thoại "Thay đổi". Tăng số khách ở bước "Xác nhận" thì có dòng người đi trống → wizard tự
   * về bước "Thông tin" (resolveBookingStep) để khách điền tiếp.
   */
  function applyTrip(next: TripSelectionValues) {
    setValue("departureId", next.departureId);
    setValue("guests", next.guests);
    resizeTravelers(next.guests);
    clearErrors(["departureId", "guests"]);
    clearErrors("root.server");
    writeUrl(step, "replace");
  }

  async function continueFromDetails() {
    const valid = await trigger([...DETAIL_FIELDS], { shouldFocus: true });
    if (valid) writeUrl("xac-nhan", "push");
  }

  const submit = handleSubmit(
    async (values) => {
      const result = await createBookingAction({ ...values, tourSlug: tour.slug });
      if (result.ok) {
        toast.success("Đặt tour thành công", {
          description: `Mã đơn của bạn: ${result.code}. Đây là bản thử nghiệm, chưa thu tiền thật.`,
        });
        router.push(result.redirectTo);
        return;
      }
      const fieldErrors = Object.entries(result.fieldErrors ?? {});
      const tripMessages = fieldErrors.filter(([field]) => TRIP_FIELDS.includes(field)).map(([, message]) => message);
      const detailErrors = fieldErrors.filter(([field]) => !TRIP_FIELDS.includes(field));
      for (const [field, message] of detailErrors) setError(field as FieldPath<BookingFormValues>, { message });
      // Lỗi về chuyến/số khách (hết chỗ, đã đóng đặt chỗ...) không có ô để gắn: hiện ở đầu form, khách bấm "Thay đổi".
      const rootMessage = [result.message, ...tripMessages].filter(Boolean).join(" ");
      if (rootMessage) setError("root.server", { message: rootMessage });
      // Lỗi ở thông tin người liên hệ/người đi thì đưa khách về bước "Thông tin" để sửa.
      if (detailErrors.length > 0) writeUrl("thong-tin", "push");
    },
    // Không nên xảy ra (đã validate từng bước), nhưng nếu có thì về bước "Thông tin".
    () => writeUrl("thong-tin", "push"),
  );

  const stepIndex = BOOKING_STEPS.findIndex((s) => s.value === step);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-start">
      <FormProvider {...form}>
        <form
          // Nhấn Enter trong một ô ở bước "Thông tin" cũng là submit: khi đó chỉ "Tiếp tục", chưa tạo đơn.
          onSubmit={(event) => {
            if (step === "xac-nhan") return submit(event);
            event.preventDefault();
            void continueFromDetails();
          }}
          noValidate
          className="min-w-0 space-y-6"
        >
          <BookingSteps current={step} />

          <div>
            <p className="text-sm font-semibold text-primary-800">
              Bước {stepIndex + 1}/{BOOKING_STEPS.length}
            </p>
            <h2 ref={headingRef} tabIndex={-1} className="mt-1 scroll-mt-24 text-2xl font-bold text-ink outline-none">
              {STEP_TITLES[step]}
            </h2>
          </div>

          <FormError message={formState.errors.root?.server?.message} />

          {step === "thong-tin" ? <StepDetails travelers={travelers} /> : null}
          {step === "xac-nhan" && selectedDeparture ? (
            <StepReview
              tour={tour}
              departure={selectedDeparture}
              onEditTrip={() => setTripDialogOpen(true)}
              onEditDetails={() => writeUrl("thong-tin", "push")}
            />
          ) : null}

          <div className="flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:justify-between">
            {step === "xac-nhan" ? (
              <Button
                variant="outline"
                size="lg"
                disabled={formState.isSubmitting}
                onClick={() => writeUrl("thong-tin", "push")}
              >
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
            ) : null}
            {step === "xac-nhan" ? (
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
                {formState.isSubmitting ? "Đang đặt tour..." : "Xác nhận đặt tour"}
              </Button>
            ) : null}
          </div>
        </form>
      </FormProvider>

      <BookingSummaryCard
        tour={tour}
        departure={selectedDeparture ?? null}
        guests={guests}
        onChangeTrip={formState.isSubmitting ? undefined : () => setTripDialogOpen(true)}
      />
      {/* Ngoài <form> của wizard — xem ghi chú ở ChangeTripDialog. */}
      <ChangeTripDialog
        open={tripDialogOpen}
        onOpenChange={setTripDialogOpen}
        departures={departures}
        value={{ departureId, guests }}
        onApply={applyTrip}
      />
    </div>
  );
}
