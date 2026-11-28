"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormError } from "@/components/auth/FormError";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { updateProfileAction } from "@/lib/actions/account";
import { profileSchema, type ProfileFormValues } from "@/lib/schemas/account";

export function ProfileForm({ fullName, email, phone }: { fullName: string; email: string; phone: string | null }) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName, phone: phone ?? "" },
  });

  async function onSubmit(values: ProfileFormValues) {
    const result = await updateProfileAction(values);
    if (result.ok) {
      reset({ fullName: result.data.fullName, phone: result.data.phone ?? "" });
      toast.success("Đã lưu thông tin cá nhân");
      return;
    }

    Object.entries(result.fieldErrors ?? {}).forEach(([field, message], index) => {
      setError(field as keyof ProfileFormValues, { message }, { shouldFocus: index === 0 });
    });
    if (result.message) setError("root.server", { message: result.message });
  }

  return (
    <form method="post" onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <FormError message={errors.root?.server?.message} />
        <Field data-invalid={!!errors.fullName}>
          <FieldLabel htmlFor="account-full-name">Họ và tên</FieldLabel>
          <Input
            id="account-full-name"
            autoComplete="name"
            className="h-11"
            aria-invalid={!!errors.fullName}
            aria-describedby={errors.fullName ? "account-full-name-error" : undefined}
            {...register("fullName")}
          />
          <FieldError id="account-full-name-error" errors={[errors.fullName]} />
        </Field>
        <Field>
          <FieldLabel htmlFor="account-email">Email</FieldLabel>
          <Input
            id="account-email"
            type="email"
            value={email}
            readOnly
            className="h-11 bg-surface-muted"
            aria-describedby="account-email-help"
          />
          <FieldDescription id="account-email-help">
            Email dùng để đăng nhập, hiện chưa thay đổi được.
          </FieldDescription>
        </Field>
        <Field data-invalid={!!errors.phone}>
          <FieldLabel htmlFor="account-phone">Số điện thoại</FieldLabel>
          <Input
            id="account-phone"
            type="tel"
            autoComplete="tel"
            className="h-11"
            aria-invalid={!!errors.phone}
            aria-describedby={errors.phone ? "account-phone-help account-phone-error" : "account-phone-help"}
            {...register("phone")}
          />
          <FieldDescription id="account-phone-help">
            Dùng để điền sẵn khi đặt tour, khách sạn và vé máy bay.
          </FieldDescription>
          <FieldError id="account-phone-error" errors={[errors.phone]} />
        </Field>
        <Button type="submit" size="lg" disabled={!isDirty || isSubmitting} aria-busy={isSubmitting} className="self-start">
          {isSubmitting ? "Đang lưu…" : "Lưu thay đổi"}
        </Button>
      </FieldGroup>
    </form>
  );
}
