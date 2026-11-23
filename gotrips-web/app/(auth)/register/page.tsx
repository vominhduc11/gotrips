import type { Metadata } from "next";
import { AppLink } from "@/components/common/AppLink";
import { AuthShell } from "@/components/auth/AuthShell";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata: Metadata = {
  title: "Đăng ký",
  description: "Tạo tài khoản GoTrips miễn phí để đặt tour nhanh hơn và theo dõi các chuyến đi của bạn.",
  robots: { index: false },
};

export default function RegisterPage() {
  return (
    <AuthShell
      title="Tạo tài khoản"
      description="Chỉ mất một phút để đăng ký. Có tài khoản, bạn đặt tour nhanh hơn và theo dõi mọi chuyến đi ở một nơi."
      footer={
        <>
          Đã có tài khoản?{" "}
          <AppLink href="/login" className="font-semibold text-primary-800 underline underline-offset-4">
            Đăng nhập
          </AppLink>
        </>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}
