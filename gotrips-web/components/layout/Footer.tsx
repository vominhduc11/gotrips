import { AppLink } from "@/components/common/AppLink";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/common/Container";
import { Mail, MapPin, Phone } from "lucide-react";
import { Logo } from "./Logo";

interface FooterLink {
  label: string;
  href?: string;
  comingSoon?: boolean;
}

const COLUMNS: Array<{ title: string; links: FooterLink[] }> = [
  {
    title: "Về GoTrips",
    links: [
      { label: "Giới thiệu", href: "/about" },
      { label: "Tin tức & cẩm nang", href: "/news" },
      { label: "Tuyển dụng", href: "/careers" },
      { label: "Liên hệ", href: "/contact" },
    ],
  },
  {
    title: "Hỗ trợ",
    links: [
      { label: "Trung tâm trợ giúp", href: "/help" },
      { label: "Hướng dẫn đặt tour", href: "/help/how-to-book" },
      { label: "Chính sách hủy tour", href: "/help/cancellation" },
      { label: "Câu hỏi thường gặp", href: "/faq" },
    ],
  },
  {
    title: "Dịch vụ",
    links: [
      { label: "Tour du lịch", href: "/tours" },
      { label: "Khách sạn", comingSoon: true },
      { label: "Vé máy bay", comingSoon: true },
    ],
  },
];

const linkClass = "rounded-sm text-neutral-300 hover:text-white hover:underline";

export function Footer() {
  return (
    <footer className="on-dark bg-primary-950 text-neutral-300">
      <Container className="py-12 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_2fr]">
          <div>
            <Logo tone="dark" />
            <p className="mt-4 max-w-sm text-sm leading-6">
              GoTrips là nền tảng đặt tour du lịch trực tuyến: giá minh bạch, lịch khởi hành rõ ràng và
              đội ngũ hỗ trợ đồng hành trước, trong và sau chuyến đi.
            </p>
            <address className="mt-6 space-y-3 text-sm not-italic">
              <p className="flex items-start gap-3">
                <Phone aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary-300" />
                <span>
                  Hotline 24/7:{" "}
                  <a href="tel:1900000000" className={linkClass}>
                    1900 000 000
                  </a>
                </span>
              </p>
              <p className="flex items-start gap-3">
                <Mail aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary-300" />
                <a href="mailto:hello@gotrips.example" className={linkClass}>
                  hello@gotrips.example
                </a>
              </p>
              <p className="flex items-start gap-3">
                <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary-300" />
                <span>123 Đường Mẫu, Quận 1, TP. Hồ Chí Minh</span>
              </p>
            </address>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {COLUMNS.map((column) => (
              <nav key={column.title} aria-label={column.title}>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-white">{column.title}</h2>
                <ul className="mt-4 space-y-3 text-sm">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      {link.href ? (
                        <AppLink href={link.href} className={linkClass}>
                          {link.label}
                        </AppLink>
                      ) : (
                        <span className="flex flex-wrap items-center gap-2 text-neutral-400">
                          {link.label}
                          {link.comingSoon ? <Badge variant="soon">Sắp ra mắt</Badge> : null}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-primary-800 pt-6 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 GoTrips. Bảo lưu mọi quyền.</p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            <li>
              <AppLink href="/terms" className={linkClass}>
                Điều khoản sử dụng
              </AppLink>
            </li>
            <li>
              <AppLink href="/privacy" className={linkClass}>
                Chính sách bảo mật
              </AppLink>
            </li>
          </ul>
        </div>
      </Container>
    </footer>
  );
}
