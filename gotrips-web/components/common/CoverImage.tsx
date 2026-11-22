"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * Ảnh bìa LẤP ĐẦY khung cha (luôn `absolute inset-0`, nên cha phải là `relative` và có kích thước/aspect-ratio).
 * Có nền gradient dự phòng: nếu ảnh lỗi thì ẩn ảnh (không hiện icon ảnh vỡ) và để lộ gradient.
 * Là Client Component chỉ vì cần `onError`.
 *
 * `className` áp lên lớp nền gradient, `imageClassName` áp lên thẻ ảnh (vd hiệu ứng hover).
 */
export function CoverImage({
  src,
  alt,
  sizes,
  preload = false,
  tone = "light",
  className,
  imageClassName,
}: {
  src: string;
  alt: string;
  sizes: string;
  /** Chỉ dùng cho ảnh LCP (hero). */
  preload?: boolean;
  /** Tông gradient dự phòng: `dark` để chữ trắng phía trên vẫn đọc được. */
  tone?: "light" | "dark";
  className?: string;
  imageClassName?: string;
}) {
  const [failed, setFailed] = useState(false);

  // Ảnh có thể lỗi TRƯỚC khi React hydrate → `onError` bị lỡ. Kiểm tra lại ngay khi gắn vào DOM.
  const checkAlreadyFailed = useCallback((img: HTMLImageElement | null) => {
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, []);

  return (
    <div
      className={cn(
        "absolute inset-0 overflow-hidden bg-linear-to-br",
        tone === "dark" ? "from-primary-900 to-primary-700" : "from-primary-100 to-primary-300",
        className,
      )}
    >
      {failed ? null : (
        <Image
          ref={checkAlreadyFailed}
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          preload={preload}
          onError={() => setFailed(true)}
          className={cn("object-cover", imageClassName)}
        />
      )}
    </div>
  );
}
