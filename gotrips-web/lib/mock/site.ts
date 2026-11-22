import type { HeroBanner } from "@/lib/types";
import { unsplash } from "./images";

/** Ảnh nền hero của Trang chủ (ảnh rộng, tải lớn hơn để không bị mờ trên màn hình lớn). */
export const heroBanner: HeroBanner = {
  imageUrl: unsplash("photo-1528127269322-539801943592", 2400),
  imageAlt: "Du thuyền nhỏ trên vịnh Hạ Long giữa những hòn đảo đá vôi",
};
