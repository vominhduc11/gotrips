"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { registerAction } from "@/lib/actions/auth";
import { PASSWORD_MIN_LENGTH, registerSchema, type RegisterFormValues } from "@/lib/schemas/auth";
import { FormError } from "./FormError";
import { PasswordInput } from "./PasswordInput";

export function RegisterForm() {
  const router = useRouter();
  const {
    register,
    control,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: "", email: "", password: "", confirmPassword: "", acceptTerms: false },
  });

  async function onSubmit(values: RegisterFormValues) {
    // Giữ đích quay lại khi khách đi từ `/login?next=...` sang đăng ký (đọc lúc submit, xem LoginForm).
    const next = new URLSearchParams(window.location.search).get("next") ?? undefined;
    const result = await registerAction(values, next);
    if (result.ok) {
      toast.success("Tạo tài khoản thành công", { description: "Bạn hãy đăng nhập để bắt đầu đặt chỗ." });
      router.push(result.redirectTo);
      return;
    }
    const fieldErrors = Object.entries(result.fieldErrors ?? {});
    for (const [field, message] of fieldErrors) setError(field as keyof RegisterFormValues, { message });
    if (fieldErrors[0]) setFocus(fieldErrors[0][0] as keyof RegisterFormValues);
    if (result.message) setError("root.server", { message: result.message });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <FormError message={errors.root?.server?.message} />

        <Field data-invalid={errors.fullName ? true : undefined}>
          <FieldLabel htmlFor="register-fullName">Họ và tên</FieldLabel>
          <Input
            id="register-fullName"
            autoComplete="name"
            placeholder="Nguyễn Văn An"
            className="h-11"
            aria-invalid={errors.fullName ? true : undefined}
            aria-describedby={errors.fullName ? "register-fullName-loi" : undefined}
            {...register("fullName")}
          />
          <FieldError id="register-fullName-loi" errors={[errors.fullName]} />
        </Field>

        <Field data-invalid={errors.email ? true : undefined}>
          <FieldLabel htmlFor="register-email">Email</FieldLabel>
          <Input
            id="register-email"
            type="email"
            autoComplete="email"
            placeholder="ban@example.com"
            className="h-11"
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? "register-email-loi" : undefined}
            {...register("email")}
          />
          <FieldError id="register-email-loi" errors={[errors.email]} />
        </Field>

        <Field data-invalid={errors.password ? true : undefined}>
          <FieldLabel htmlFor="register-password">Mật khẩu</FieldLabel>
          <PasswordInput
            id="register-password"
            autoComplete="new-password"
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? "register-password-loi" : "register-password-goi-y"}
            {...register("password")}
          />
          <FieldDescription id="register-password-goi-y">
            Tối thiểu {PASSWORD_MIN_LENGTH} ký tự, gồm cả chữ và số.
          </FieldDescription>
          <FieldError id="register-password-loi" errors={[errors.password]} />
        </Field>

        <Field data-invalid={errors.confirmPassword ? true : undefined}>
          <FieldLabel htmlFor="register-confirmPassword">Nhập lại mật khẩu</FieldLabel>
          <PasswordInput
            id="register-confirmPassword"
            autoComplete="new-password"
            aria-invalid={errors.confirmPassword ? true : undefined}
            aria-describedby={errors.confirmPassword ? "register-confirmPassword-loi" : undefined}
            {...register("confirmPassword")}
          />
          <FieldError id="register-confirmPassword-loi" errors={[errors.confirmPassword]} />
        </Field>

        <Controller
          name="acceptTerms"
          control={control}
          render={({ field, fieldState }) => (
            <Field orientation="horizontal" data-invalid={fieldState.invalid ? true : undefined} className="flex-wrap">
              <Checkbox
                id="register-acceptTerms"
                name={field.name}
                ref={field.ref}
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
                onBlur={field.onBlur}
                aria-invalid={fieldState.invalid ? true : undefined}
                aria-describedby={fieldState.invalid ? "register-acceptTerms-loi" : undefined}
                className="size-5"
              />
              <FieldLabel htmlFor="register-acceptTerms" className="flex-1 font-normal">
                Tôi đồng ý với Điều khoản sử dụng và Chính sách bảo mật của GoTrips.
              </FieldLabel>
              <FieldError id="register-acceptTerms-loi" errors={[fieldState.error]} className="basis-full" />
            </Field>
          )}
        />

        <Button type="submit" size="lg" disabled={isSubmitting} aria-busy={isSubmitting} className="w-full">
          {isSubmitting ? <LoaderCircle aria-hidden="true" className="size-5 animate-spin motion-reduce:animate-none" /> : null}
          {isSubmitting ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
        </Button>
      </FieldGroup>
    </form>
  );
}
