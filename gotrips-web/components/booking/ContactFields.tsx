"use client";

import { useFormContext } from "react-hook-form";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ContactValues } from "@/lib/schemas/booking";

export const bookingInputClass = "h-11 bg-surface";

/** Phần form mà hai khối dưới đây cần — form đặt tour, đặt phòng, đặt vé đều có `contact` và `note`. */
type ContactForm = { contact: ContactValues; note: string };

/**
 * Khối "Người liên hệ" (họ tên, email, số điện thoại) dùng chung cho bước "Thông tin" của trang đặt tour, đặt phòng,
 * đặt vé. Đọc form qua `useFormContext` nên phải nằm trong `<FormProvider>` của wizard.
 */
export function ContactFields({ description }: { description: string }) {
  const {
    register,
    formState: { errors },
  } = useFormContext<ContactForm>();
  const contactErrors = errors.contact;

  return (
    <FieldSet>
      <FieldLegend className="text-lg font-bold text-ink">Người liên hệ</FieldLegend>
      <FieldDescription>{description}</FieldDescription>
      <FieldGroup>
        <Field data-invalid={contactErrors?.fullName ? true : undefined}>
          <FieldLabel htmlFor="booking-contact-name">Họ và tên</FieldLabel>
          <Input
            id="booking-contact-name"
            autoComplete="name"
            className={bookingInputClass}
            aria-invalid={contactErrors?.fullName ? true : undefined}
            aria-describedby={contactErrors?.fullName ? "booking-contact-name-loi" : undefined}
            {...register("contact.fullName")}
          />
          <FieldError id="booking-contact-name-loi" errors={[contactErrors?.fullName]} />
        </Field>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field data-invalid={contactErrors?.email ? true : undefined}>
            <FieldLabel htmlFor="booking-contact-email">Email</FieldLabel>
            <Input
              id="booking-contact-email"
              type="email"
              autoComplete="email"
              className={bookingInputClass}
              aria-invalid={contactErrors?.email ? true : undefined}
              aria-describedby={contactErrors?.email ? "booking-contact-email-loi" : undefined}
              {...register("contact.email")}
            />
            <FieldError id="booking-contact-email-loi" errors={[contactErrors?.email]} />
          </Field>
          <Field data-invalid={contactErrors?.phone ? true : undefined}>
            <FieldLabel htmlFor="booking-contact-phone">Số điện thoại</FieldLabel>
            <Input
              id="booking-contact-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="0901 234 567"
              className={bookingInputClass}
              aria-invalid={contactErrors?.phone ? true : undefined}
              aria-describedby={contactErrors?.phone ? "booking-contact-phone-loi" : undefined}
              {...register("contact.phone")}
            />
            <FieldError id="booking-contact-phone-loi" errors={[contactErrors?.phone]} />
          </Field>
        </div>
      </FieldGroup>
    </FieldSet>
  );
}

/** Ô "Ghi chú" (không bắt buộc) ở cuối bước "Thông tin". */
export function NoteField({ placeholder }: { placeholder: string }) {
  const {
    register,
    formState: { errors },
  } = useFormContext<ContactForm>();

  return (
    <Field data-invalid={errors.note ? true : undefined}>
      <FieldLabel htmlFor="booking-note">
        Ghi chú <span className="font-normal text-ink-muted">(không bắt buộc)</span>
      </FieldLabel>
      <Textarea
        id="booking-note"
        rows={3}
        placeholder={placeholder}
        className="bg-surface"
        aria-invalid={errors.note ? true : undefined}
        aria-describedby={errors.note ? "booking-note-loi" : undefined}
        {...register("note")}
      />
      <FieldError id="booking-note-loi" errors={[errors.note]} />
    </Field>
  );
}
