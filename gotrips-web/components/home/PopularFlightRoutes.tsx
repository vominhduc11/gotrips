import { FlightRouteCard } from "@/components/flight/FlightRouteCard";
import { Container } from "@/components/common/Container";
import { SectionHeading } from "@/components/common/SectionHeading";
import { getPopularFlightRoutes } from "@/lib/data/flight-routes";

/**
 * Section "Chặng bay phổ biến" (bản THỬ NGHIỆM, dữ liệu mock). Chưa có trang chuyến bay nên KHÔNG có nút "Xem tất cả";
 * mô tả nói rõ chưa xem được kết quả/chưa đặt được, và giá chỉ là giá tham khảo.
 * Nền `bg-surface-muted`: nằm sau "Khách sạn nổi bật" (nền trắng) và trước "Vì sao chọn GoTrips" (nền trắng).
 */
export async function PopularFlightRoutes() {
  const routes = await getPopularFlightRoutes();

  return (
    <section aria-labelledby="chang-bay-pho-bien-heading" className="bg-surface-muted py-14 sm:py-20">
      <Container>
        <SectionHeading
          id="chang-bay-pho-bien-heading"
          eyebrow="Bản thử nghiệm"
          title="Chặng bay phổ biến"
          description="Bản thử nghiệm với dữ liệu minh hoạ. Bấm một thẻ để điền sẵn điểm đi và điểm đến vào ô tìm kiếm Vé máy bay ở đầu trang — hiện chưa xem được chuyến bay và chưa đặt vé được. Giá chỉ để tham khảo."
        />

        {routes.length > 0 ? (
          <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {routes.map((route) => (
              <li key={route.id}>
                <FlightRouteCard route={route} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-8 rounded-card bg-surface p-8 text-center text-ink-muted shadow-card">
            Hiện chưa có chặng bay nào để gợi ý. Vui lòng quay lại sau.
          </p>
        )}
      </Container>
    </section>
  );
}
