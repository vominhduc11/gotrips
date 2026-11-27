import { CoverImage } from "@/components/common/CoverImage";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { cn } from "@/lib/cn";
import type { ImageView } from "@/lib/types";

/**
 * Khung ảnh của khách sạn và loại phòng. Một ảnh thì chỉ hiện ảnh; từ hai ảnh thì thành carousel có nút chuyển.
 * Không có "use client": ở đây chỉ ghép các Client Component có sẵn (`Carousel`, `CoverImage`).
 *
 * Carousel chạy vòng (`loop`): nếu không, nút bị khoá khi tới đầu/cuối và người dùng bàn phím mất focus ngay trên nút
 * vừa bấm. Không truyền `onClick`/`disabled` cho hai nút: component trải props sau cùng nên sẽ đè mất hành vi có sẵn.
 */
export function PhotoCarousel({
  images,
  label,
  sizes,
  aspectClassName,
  preload = false,
  className,
}: {
  images: ImageView[];
  /** Tên bộ ảnh cho trình đọc màn hình, ví dụ "Ảnh Phòng Deluxe". */
  label: string;
  sizes: string;
  /** Tỉ lệ khung của mỗi ảnh, ví dụ "aspect-16/9". */
  aspectClassName: string;
  /** Chỉ bật cho bộ ảnh đầu trang (ảnh LCP): ảnh ĐẦU được preload, các ảnh sau luôn tải lười. */
  preload?: boolean;
  /** Áp lên khung ngoài (bo góc, đổ bóng, bề rộng). */
  className?: string;
}) {
  const [first] = images;
  if (!first) return null;

  if (images.length === 1) {
    return (
      <div className={cn("relative overflow-hidden", aspectClassName, className)}>
        <CoverImage src={first.url} alt={first.alt} sizes={sizes} preload={preload} />
      </div>
    );
  }

  return (
    <Carousel
      aria-label={label}
      aria-roledescription="bộ ảnh"
      opts={{ loop: true }}
      className={cn("overflow-hidden", className)}
    >
      {/* Mặc định carousel chừa khe giữa các slide (-ml-4 / pl-4); ảnh phủ kín khung nên bỏ khe. */}
      <CarouselContent className="ml-0">
        {images.map((image, index) => (
          <CarouselItem
            key={`${index}:${image.url}`}
            aria-roledescription="ảnh"
            aria-label={`${index + 1} trên ${images.length}`}
            className="pl-0"
          >
            <div className={cn("relative", aspectClassName)}>
              <CoverImage src={image.url} alt={image.alt} sizes={sizes} preload={preload && index === 0} />
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      {/* Vị trí mặc định của hai nút nằm NGOÀI khung (bị cắt, hoặc làm tràn ngang trên điện thoại): đưa vào trong. */}
      <CarouselPrevious aria-label="Ảnh trước" className="left-3 shadow-card" />
      <CarouselNext aria-label="Ảnh sau" className="right-3 shadow-card" />
    </Carousel>
  );
}
