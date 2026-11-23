import { Container } from "@/components/common/Container";
import { SectionHeading } from "@/components/common/SectionHeading";
import { HotelCard } from "@/components/hotel/HotelCard";
import { getFeaturedHotels } from "@/lib/data/hotels";

/**
 * Section "Khách sạn nổi bật" (bản THỬ NGHIỆM, dữ liệu mock). Chưa có trang khách sạn nên KHÔNG có nút "Xem tất cả";
 * mô tả nói rõ chưa xem được kết quả/chưa đặt được để không trông như dịch vụ đã chạy.
 * Nền trắng: nằm giữa "Tour nổi bật" (`bg-surface-muted`) và "Chặng bay phổ biến" (`bg-surface-muted`) nên hai section
 * liền kề luôn khác màu nền.
 */
export async function FeaturedHotels() {
  const hotels = await getFeaturedHotels();

  return (
    <section aria-labelledby="khach-san-noi-bat-heading" className="py-14 sm:py-20">
      <Container>
        <SectionHeading
          id="khach-san-noi-bat-heading"
          eyebrow="Bản thử nghiệm"
          title="Khách sạn nổi bật"
          description="Bản thử nghiệm với dữ liệu minh hoạ. Bấm một thẻ để điền sẵn điểm đến vào ô tìm kiếm Khách sạn ở đầu trang — hiện chưa xem được kết quả và chưa đặt phòng được."
        />

        {hotels.length > 0 ? (
          <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {hotels.map((hotel) => (
              <li key={hotel.id}>
                <HotelCard hotel={hotel} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-8 rounded-card bg-surface-muted p-8 text-center text-ink-muted">
            Hiện chưa có khách sạn nào để gợi ý. Vui lòng quay lại sau.
          </p>
        )}
      </Container>
    </section>
  );
}
