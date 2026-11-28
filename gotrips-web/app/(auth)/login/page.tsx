import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthSwitchLink } from "@/components/auth/AuthSwitchLink";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Đăng nhập",
  description: "Đăng nhập GoTrips để xem và quản lý các tour bạn đã đặt.",
  // Trang tài khoản không có nội dung cho tìm kiếm.
  robots: { index: false },
};

export default function LoginPage() {
  return (
    <AuthShell
      title="Đăng nhập"
      description="Chào mừng bạn quay lại! Đăng nhập để xem và quản lý các tour đã đặt."
      footer={
        <>
          Chưa có tài khoản?{" "}
          <AuthSwitchLink to="/register" className="font-semibold text-primary-800 underline underline-offset-4">
            Đăng ký ngay
          </AuthSwitchLink>
        </>
      }
    >
      <LoginForm />
    </AuthShell>
  );
}
