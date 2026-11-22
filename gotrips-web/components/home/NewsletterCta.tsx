"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/common/SectionHeading";
import { Container } from "@/components/common/Container";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { newsletterSchema, type NewsletterFormValues } from "@/lib/schemas/newsletter";

/** Đăng ký nhận ưu đãi. Chỉ validate phía client và hiện lời cảm ơn tại chỗ — không gửi đi đâu. */
export function NewsletterCta() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitSuccessful },
  } = useForm<NewsletterFormValues>({
    resolver: zodResolver(newsletterSchema),
    defaultValues: { email: "" },
  });
  const error = errors.email?.message;
  // Chưa có API đăng ký: submit hợp lệ là đủ để hiện lời cảm ơn.
  const subscribed = isSubmitSuccessful;

  return (
    <section aria-labelledby="uu-dai-heading" className="py-14 sm:py-20">
      <Container>
        <div className="on-dark grid items-center gap-8 rounded-card bg-primary-800 p-6 sm:p-10 lg:grid-cols-2 lg:gap-12 lg:p-14">
          <SectionHeading
            id="uu-dai-heading"
            tone="dark"
            eyebrow="Ưu đãi từ GoTrips"
            title="Nhận ưu đãi tour mới nhất qua email"
            description="Đăng ký để biết sớm các tour giảm giá và ngày khởi hành mới. Bạn có thể hủy đăng ký bất cứ lúc nào."
          />

          <div>
            {/* Vùng thông báo luôn có trong DOM để trình đọc màn hình đọc lời cảm ơn khi nó xuất hiện. */}
            <div role="status" aria-live="polite">
              {subscribed ? (
                <p className="flex items-start gap-3 rounded-control bg-success-50 p-4 text-base font-medium text-success-700">
                  <ShieldCheck aria-hidden="true" className="mt-0.5 size-6 shrink-0" />
                  <span>
                    Cảm ơn bạn! Chúng tôi sẽ gửi những ưu đãi mới nhất tới email bạn vừa đăng ký.
                  </span>
                </p>
              ) : null}
            </div>

            {subscribed ? null : (
              <form onSubmit={handleSubmit(() => {})} noValidate>
                <label htmlFor="email-uu-dai" className="sr-only">
                  Địa chỉ email của bạn
                </label>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    id="email-uu-dai"
                    {...register("email")}
                    type="email"
                    autoComplete="email"
                    placeholder="Nhập địa chỉ email của bạn"
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? "loi-email-uu-dai" : undefined}
                    className="h-12 min-w-0 flex-1 rounded-control border border-transparent bg-surface px-4 text-base text-ink placeholder:text-neutral-500"
                  />
                  <Button type="submit" variant="accent" size="lg">
                    Đăng ký
                    <ArrowRight aria-hidden="true" className="size-5" />
                  </Button>
                </div>
                {error ? (
                  <p
                    id="loi-email-uu-dai"
                    role="alert"
                    className="mt-3 rounded-control bg-danger-50 px-3 py-2 text-sm font-medium text-danger-700"
                  >
                    {error}
                  </p>
                ) : null}
              </form>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}
