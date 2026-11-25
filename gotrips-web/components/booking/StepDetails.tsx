"use client";

import { Controller, useFormContext, type FieldArrayWithId } from "react-hook-form";
import { Field, FieldDescription, FieldError, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { BookingFormValues } from "@/lib/schemas/booking";
import { BirthDatePicker } from "./BirthDatePicker";
import { bookingInputClass as inputClass, ContactFields, NoteField } from "./ContactFields";

/** Bước 2: người liên hệ, danh sách người đi (số dòng = số khách, do wizard đồng bộ) và ghi chú. */
export function StepDetails({ travelers }: { travelers: FieldArrayWithId<BookingFormValues, "travelers", "id">[] }) {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<BookingFormValues>();
  const travelersError = errors.travelers?.root ?? errors.travelers;

  return (
    <div className="space-y-8">
      <ContactFields description="GoTrips liên hệ qua email và số điện thoại này để xác nhận đơn." />

      <FieldSet>
        <FieldLegend className="text-lg font-bold text-ink">Người đi ({travelers.length})</FieldLegend>
        <FieldDescription>Họ tên theo giấy tờ tuỳ thân để đơn vị tổ chức làm thủ tục, bảo hiểm du lịch.</FieldDescription>
        <FieldError errors={[travelersError]} />
        <ol className="space-y-4">
          {travelers.map((traveler, index) => {
            const travelerErrors = errors.travelers?.[index];
            const nameId = `booking-traveler-${index}-name`;
            const dobId = `booking-traveler-${index}-dob`;
            return (
              <li key={traveler.id} className="rounded-card border border-line bg-surface p-4">
                <p className="mb-3 font-semibold text-ink">Khách {index + 1}</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field data-invalid={travelerErrors?.fullName ? true : undefined}>
                    <FieldLabel htmlFor={nameId}>Họ và tên</FieldLabel>
                    <Input
                      id={nameId}
                      autoComplete="off"
                      className={inputClass}
                      aria-invalid={travelerErrors?.fullName ? true : undefined}
                      aria-describedby={travelerErrors?.fullName ? `${nameId}-loi` : undefined}
                      {...register(`travelers.${index}.fullName`)}
                    />
                    <FieldError id={`${nameId}-loi`} errors={[travelerErrors?.fullName]} />
                  </Field>
                  <Field data-invalid={travelerErrors?.dateOfBirth ? true : undefined}>
                    <FieldLabel id={`${dobId}-label`} htmlFor={dobId}>
                      Ngày sinh <span className="font-normal text-ink-muted">(không bắt buộc)</span>
                    </FieldLabel>
                    <Controller
                      control={control}
                      name={`travelers.${index}.dateOfBirth`}
                      render={({ field }) => (
                        <BirthDatePicker
                          ref={field.ref}
                          id={dobId}
                          labelId={`${dobId}-label`}
                          value={field.value}
                          onChange={field.onChange}
                          invalid={!!travelerErrors?.dateOfBirth}
                          describedBy={travelerErrors?.dateOfBirth ? `${dobId}-loi` : undefined}
                        />
                      )}
                    />
                    <FieldError id={`${dobId}-loi`} errors={[travelerErrors?.dateOfBirth]} />
                  </Field>
                </div>
              </li>
            );
          })}
        </ol>
      </FieldSet>

      <NoteField placeholder="Ví dụ: ăn chay, cần ghế trẻ em, đón tại khách sạn..." />
    </div>
  );
}
