import type { ComponentType, SVGProps } from "react";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { HeadsetIcon, ShieldCheckIcon, TagIcon, ZapIcon } from "@/components/ui/icons";

const REASONS: Array<{
  title: string;
  description: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}> = [
  {
    title: "Giá minh bạch",
    description: "Giá hiển thị rõ ràng ngay từ đầu cho từng ngày khởi hành, không phụ thu bất ngờ khi thanh toán.",
    Icon: TagIcon,
  },
  {
    title: "Xác nhận nhanh",
    description: "Chọn ngày còn chỗ, đặt trực tuyến và nhận xác nhận đặt chỗ nhanh chóng qua email.",
    Icon: ZapIcon,
  },
  {
    title: "Hỗ trợ 24/7",
    description: "Đội ngũ tư vấn luôn sẵn sàng giải đáp trước, trong và sau chuyến đi của bạn.",
    Icon: HeadsetIcon,
  },
  {
    title: "Thanh toán an toàn",
    description: "Thông tin thanh toán được bảo mật, kèm nhiều phương thức để bạn chọn cách thuận tiện nhất.",
    Icon: ShieldCheckIcon,
  },
];

export function WhyGoTrips() {
  return (
    <section aria-labelledby="vi-sao-heading" className="py-14 sm:py-20">
      <Container>
        <SectionHeading
          id="vi-sao-heading"
          align="center"
          eyebrow="Cam kết của chúng tôi"
          title="Vì sao chọn GoTrips?"
          description="Đặt tour dễ dàng, yên tâm từ lúc chọn ngày đến khi trở về."
        />

        <ul className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {REASONS.map(({ title, description, Icon }) => (
            <li key={title} className="text-center sm:text-left">
              <span className="mx-auto flex size-12 items-center justify-center rounded-control bg-primary-100 text-primary-800 sm:mx-0">
                <Icon className="size-6" />
              </span>
              <h3 className="mt-4 text-lg font-bold text-ink">{title}</h3>
              <p className="mt-2 text-base leading-7 text-ink-muted">{description}</p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
