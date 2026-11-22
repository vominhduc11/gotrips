import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { Providers } from "./providers";
import "./globals.css";

// Be Vietnam Pro không phải variable font nên phải khai báo weight; cần subset "vietnamese" cho dấu tiếng Việt.
const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-be-vietnam-pro",
});

export const metadata: Metadata = {
  title: {
    default: "GoTrips – Đặt tour du lịch trực tuyến",
    template: "%s | GoTrips",
  },
  description:
    "GoTrips giúp bạn tìm và đặt tour du lịch trong nước dễ dàng: giá minh bạch, lịch khởi hành rõ ràng, xác nhận nhanh và hỗ trợ 24/7.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`${beVietnamPro.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <Providers>
          <a
            href="#noi-dung-chinh"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-control focus:bg-primary-700 focus:px-4 focus:py-2 focus:font-semibold focus:text-white"
          >
            Bỏ qua điều hướng, đến nội dung chính
          </a>
          <Header />
          <main id="noi-dung-chinh" className="flex-1">
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
