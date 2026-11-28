import { ClipboardList } from "lucide-react";
import { redirect } from "next/navigation";
import { AppLink } from "@/components/common/AppLink";
import { SectionUnavailable } from "@/components/common/SectionUnavailable";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getMyAccount } from "@/lib/data/account";
import { loadSection } from "@/lib/data/load-section";
import { buildLoginHref } from "@/lib/safe-redirect";
import { ChangePasswordForm } from "./ChangePasswordForm";
import { ProfileForm } from "./ProfileForm";

const gridClass = "grid items-start gap-6 lg:grid-cols-2";
const panelClass = "space-y-5 rounded-card bg-surface p-5 shadow-card sm:p-6";

export async function AccountContent() {
  const result = await loadSection("hồ sơ tài khoản", getMyAccount);
  if (!result.ok) return <SectionUnavailable what="hồ sơ tài khoản" className="bg-surface-muted" />;
  if (result.data.status === "unauthenticated") redirect(buildLoginHref("/account"));

  const { fullName, email, phone } = result.data.data;
  return (
    <>
      <div className={gridClass}>
        <section aria-labelledby="account-profile-title" className={panelClass}>
          <h2 id="account-profile-title" className="text-xl font-semibold text-ink">Thông tin cá nhân</h2>
          <ProfileForm fullName={fullName} email={email} phone={phone} />
        </section>
        <section aria-labelledby="account-password-title" className={panelClass}>
          <h2 id="account-password-title" className="text-xl font-semibold text-ink">Đổi mật khẩu</h2>
          <ChangePasswordForm email={email} />
        </section>
      </div>
      <Button asChild variant="outline" className="mt-6">
        <AppLink href="/bookings">
          <ClipboardList aria-hidden="true" />
          Đơn đặt chỗ của tôi
        </AppLink>
      </Button>
    </>
  );
}

export function AccountSkeleton() {
  return (
    <div role="status" className={gridClass}>
      <span className="sr-only">Đang tải hồ sơ tài khoản…</span>
      {["profile", "password"].map((panel) => (
        <div key={panel} aria-hidden="true" className={panelClass}>
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-11 w-36" />
        </div>
      ))}
    </div>
  );
}
