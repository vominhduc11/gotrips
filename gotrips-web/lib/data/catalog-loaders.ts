import { cache } from "react";
import { getAirports } from "./airports";
import { getPopularDestinations } from "./home";
import { loadSection } from "./load-section";

/**
 * Nạp danh sách dùng chung nhiều section trong CÙNG một lượt render: điểm đến (section "Điểm đến", form tìm tour, form
 * tìm khách sạn) và sân bay (form tìm vé). `cache` của React gộp các lời gọi trong một request về một lần nạp, để
 * nhiều section chờ song song không cùng đập vào API lúc cache `"use cache"` còn nguội.
 */
export const loadDestinations = cache(() => loadSection("điểm đến", getPopularDestinations));

export const loadAirports = cache(() => loadSection("sân bay", getAirports));
