import { Star } from "lucide-react";

/**
 * Hàng 5 sao theo điểm nguyên 1–5; đọc to bằng `aria-label` thay vì từng sao.
 * `label` thay câu đọc mặc định ("4 trên 5 sao") khi ngữ cảnh cần rõ hơn, vd hạng sao khách sạn: "Khách sạn 4 sao".
 */
export function StarRating({ rating, label }: { rating: number; label?: string }) {
  return (
    <div role="img" aria-label={label ?? `${rating} trên 5 sao`} className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          aria-hidden="true"
          fill="currentColor"
          stroke="none"
          className={index < rating ? "size-5 text-star" : "size-5 text-neutral-300"}
        />
      ))}
    </div>
  );
}
