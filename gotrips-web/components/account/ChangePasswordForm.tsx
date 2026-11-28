"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormError } from "@/components/auth/FormError";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { changePasswordAction } from "@/lib/actions/account";
import { changePasswordSchema, type ChangePasswordFormValues } from "@/lib/schemas/account";
import { PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH, PASSWORD_MAX_BYTES } from "@/lib/schemas/auth";

const passwordFields = [
  { name: "currentPassword", label: "Mật khẩu hiện tại", autoComplete: "current-password" },
  { name: "newPassword", label: "Mật khẩu mới", autoComplete: "new-password" },
  { name: "confirmPassword", label: "Nhập lại mật khẩu", autoComplete: "new-password" },
] as const;

export function ChangePasswordForm({ email }: { email: string }) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  async function onSubmit(values: ChangePasswordFormValues) {
    const result = await changePasswordAction(values);
    if (result.ok) {
      reset();
      toast.success("Đã đổi mật khẩu");
      return;
    }

    Object.entries(result.fieldErrors ?? {}).forEach(([field, message], index) => {
      setError(field as keyof ChangePasswordFormValues, { message }, { shouldFocus: index === 0 });
    });
    if (result.message) setError("root.server", { message: result.message });
  }

  return (
    <form method="post" onSubmit={handleSubmit(onSubmit)} noValidate>
      <input type="hidden" name="username" autoComplete="username" value={email} />
      <FieldGroup>
        <FormError message={errors.root?.server?.message} />
        {passwordFields.map(({ name, label, autoComplete }) => {
          const id = `account-${name}`;
          const error = errors[name];
          const helpId = name === "newPassword" ? `${id}-help` : undefined;
          const describedBy = [helpId, error && `${id}-error`].filter(Boolean).join(" ");

          return (
            <Field key={name} data-invalid={!!error}>
              <FieldLabel htmlFor={id}>{label}</FieldLabel>
              <PasswordInput
                id={id}
                autoComplete={autoComplete}
                aria-invalid={!!error}
                aria-describedby={describedBy || undefined}
                {...register(name)}
              />
              {helpId && (
                <FieldDescription id={helpId}>
                  Từ {PASSWORD_MIN_LENGTH} đến {PASSWORD_MAX_LENGTH} ký tự, có cả chữ và số, tối đa {PASSWORD_MAX_BYTES} byte.
                </FieldDescription>
              )}
              <FieldError id={`${id}-error`} errors={[error]} />
            </Field>
          );
        })}
        <Button type="submit" size="lg" disabled={isSubmitting} aria-busy={isSubmitting} className="self-start">
          {isSubmitting ? "Đang đổi mật khẩu…" : "Đổi mật khẩu"}
        </Button>
      </FieldGroup>
    </form>
  );
}
