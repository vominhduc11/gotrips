import type { Metadata } from "next";
import { AppLink } from "@/components/common/AppLink";
import { Container } from "@/components/common/Container";
import { Button } from "@/components/ui/button";

// `noindex` do Next tự chèn cho trang 404 nên không khai báo thêm `robots` ở đây.
export const metadata: Metadata = {
  title: "Không tìm thấy trang",
};

/** 404 chung bằng tiếng Việt (cũng là đích của `notFound()` khi slug tour không tồn tại hoặc tour bị ẩn). */
export default function NotFound() {
  return (
    <Container className="py-20 text-center sm:py-28">
      <p className="text-sm font-semibold uppercase tracking-wide text-accent-700">Lỗi 404</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">Không tìm thấy trang bạn cần</h1>
      <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-ink-muted">
        Đường dẫn có thể đã thay đổi hoặc tour này không còn được mở bán. Hãy xem các tour đang có.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild variant="primary" size="lg">
          <AppLink href="/tours">Xem tất cả tour</AppLink>
        </Button>
        <Button asChild variant="outline" size="lg">
          <AppLink href="/">Về trang chủ</AppLink>
        </Button>
      </div>
    </Container>
  );
}
