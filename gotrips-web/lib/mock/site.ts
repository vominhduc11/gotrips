import type { BankTransferInfo, HeroBanner } from "@/lib/types";
import { unsplash } from "./images";

/** Ảnh nền hero của Trang chủ (ảnh rộng, tải lớn hơn để không bị mờ trên màn hình lớn). */
export const heroBanner: HeroBanner = {
  imageUrl: unsplash("photo-1528127269322-539801943592", 2400),
  imageAlt: "Du thuyền nhỏ trên vịnh Hạ Long giữa những hòn đảo đá vôi",
};

/**
 * Tài khoản nhận chuyển khoản trong hướng dẫn thanh toán đơn đặt tour.
 * DỮ LIỆU THỬ NGHIỆM — không phải tài khoản thật; phải thay bằng tài khoản công ty trước khi ra mắt.
 */
export const bankTransferInfo: BankTransferInfo = {
  bankName: "Ngân hàng Thử nghiệm (bản demo)",
  accountNumber: "0000 1234 5678",
  accountName: "CONG TY GOTRIPS (DEMO)",
};
