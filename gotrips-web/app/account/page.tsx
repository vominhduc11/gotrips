import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountContent, AccountSkeleton } from "@/components/account/AccountContent";
import { Container } from "@/components/common/Container";
import { PageHeader } from "@/components/common/PageHeader";

export const metadata: Metadata = {
  title: "Tài khoản của tôi",
  robots: { index: false },
};

export default function AccountPage() {
  return (
    <div className="py-8 sm:py-12">
      <Container>
        <PageHeader title="Tài khoản của tôi" description="Cập nhật thông tin cá nhân và đổi mật khẩu." />
        <div className="mt-8">
          <Suspense fallback={<AccountSkeleton />}>
            <AccountContent />
          </Suspense>
        </div>
      </Container>
    </div>
  );
}
