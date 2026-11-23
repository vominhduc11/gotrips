"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { loginAction } from "@/lib/actions/auth";
import { DEMO_ACCOUNT } from "@/lib/auth/demo-account";
import { loginSchema, type LoginFormValues } from "@/lib/schemas/auth";
import { FormError } from "./FormError";
import { PasswordInput } from "./PasswordInput";

export function LoginForm() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginFormValues) {
    const result = await loginAction(values);
    if (result.ok) {
      toast.success("Đăng nhập thành công", { description: "Đây là bản thử nghiệm, chưa có tài khoản thật." });
      router.push(result.redirectTo);
      router.refresh(); // đảm bảo Header đọc lại cookie phiên vừa đặt
      return;
    }
    // Lỗi theo ô (server kiểm lại schema) gắn vào đúng ô; lỗi chung hiện ở đầu form.
    const fieldErrors = Object.entries(result.fieldErrors ?? {});
    for (const [field, message] of fieldErrors) setError(field as keyof LoginFormValues, { message });
    if (fieldErrors[0]) setFocus(fieldErrors[0][0] as keyof LoginFormValues);
    if (result.message) setError("root.server", { message: result.message });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        {/* Gợi ý tài khoản demo cho prototype; bỏ khối này khi có đăng nhập thật. */}
        <p className="rounded-control bg-primary-50 px-4 py-3 text-sm text-primary-900">
          <strong className="font-semibold">Tài khoản thử nghiệm:</strong> {DEMO_ACCOUNT.email} / {DEMO_ACCOUNT.password}
        </p>

        <FormError message={errors.root?.server?.message} />

        <Field data-invalid={errors.email ? true : undefined}>
          <FieldLabel htmlFor="login-email">Email</FieldLabel>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder="ban@example.com"
            className="h-11"
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? "login-email-loi" : undefined}
            {...register("email")}
          />
          <FieldError id="login-email-loi" errors={[errors.email]} />
        </Field>

        <Field data-invalid={errors.password ? true : undefined}>
          <FieldLabel htmlFor="login-password">Mật khẩu</FieldLabel>
          <PasswordInput
            id="login-password"
            autoComplete="current-password"
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? "login-password-loi" : undefined}
            {...register("password")}
          />
          <FieldError id="login-password-loi" errors={[errors.password]} />
        </Field>

        <Button type="submit" size="lg" disabled={isSubmitting} aria-busy={isSubmitting} className="w-full">
          {isSubmitting ? <LoaderCircle aria-hidden="true" className="size-5 animate-spin motion-reduce:animate-none" /> : null}
          {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
        </Button>
      </FieldGroup>
    </form>
  );
}
