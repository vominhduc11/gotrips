import type { ReactNode } from "react";
import { Container } from "@/components/common/Container";

/**
 * Khung chung cho trang đăng nhập / đăng ký: thẻ căn giữa, tiêu đề h1, và dòng chuyển qua trang còn lại.
 * Header/Footer của site vẫn giữ nguyên (từ root layout) để người dùng quay lại duyệt tour dễ dàng.
 */
export function AuthShell({
  title,
  description,
  footer,
  children,
}: {
  title: string;
  description: string;
  footer: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="bg-primary-50 py-10 sm:py-16">
      <Container>
        <div className="mx-auto w-full max-w-md rounded-card bg-surface p-6 shadow-card sm:p-8">
          <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
          <p className="mt-2 text-base text-ink-muted">{description}</p>

          <div className="mt-6">{children}</div>

          <p className="mt-6 border-t border-line pt-6 text-center text-base text-ink-muted">{footer}</p>
        </div>
      </Container>
    </div>
  );
}
