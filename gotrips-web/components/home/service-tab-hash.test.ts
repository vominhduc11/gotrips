import { describe, expect, it } from "vitest";
import {
  DEFAULT_SERVICE_TAB,
  SERVICE_TAB_HASH,
  SERVICE_TABS,
  isServiceTab,
  serviceTabFromHash,
  serviceTabHref,
} from "./service-tab-hash";

describe("service-tab-hash", () => {
  it("giữ đúng ba hash đã chốt với menu Header", () => {
    expect(SERVICE_TAB_HASH).toEqual({
      tour: "tim-tour",
      hotel: "tim-khach-san",
      flight: "tim-ve-may-bay",
    });
  });

  it("mỗi hash là duy nhất (nếu trùng thì không phân biệt được tab)", () => {
    const hashes = Object.values(SERVICE_TAB_HASH);
    expect(new Set(hashes).size).toBe(hashes.length);
  });

  it("serviceTabFromHash đảo ngược đúng SERVICE_TAB_HASH, có hoặc không có dấu #", () => {
    for (const tab of SERVICE_TABS) {
      expect(serviceTabFromHash(`#${SERVICE_TAB_HASH[tab]}`)).toBe(tab);
      expect(serviceTabFromHash(SERVICE_TAB_HASH[tab])).toBe(tab);
    }
  });

  it("serviceTabHref dựng đúng đường dẫn về Trang chủ kèm hash, và serviceTabFromHash đọc lại được", () => {
    expect(serviceTabHref("tour")).toBe("/#tim-tour");
    expect(serviceTabHref("hotel")).toBe("/#tim-khach-san");
    expect(serviceTabHref("flight")).toBe("/#tim-ve-may-bay");
    for (const tab of SERVICE_TABS) {
      expect(serviceTabFromHash(serviceTabHref(tab).slice(1))).toBe(tab);
    }
  });

  it("hash không khớp tab nào thì trả null", () => {
    expect(serviceTabFromHash("")).toBeNull();
    expect(serviceTabFromHash("#")).toBeNull();
    expect(serviceTabFromHash("#abc")).toBeNull();
    expect(serviceTabFromHash("#diem-den")).toBeNull();
    // Phân biệt hoa/thường như `id` trên trang.
    expect(serviceTabFromHash("#TIM-KHACH-SAN")).toBeNull();
    // Khớp đúng toàn chuỗi, không khớp tiền tố/hậu tố.
    expect(serviceTabFromHash("#tim-khach-san-2")).toBeNull();
    expect(serviceTabFromHash("##tim-khach-san")).toBeNull();
  });

  it("tên thuộc tính có sẵn của Object không bị coi là hash hợp lệ", () => {
    expect(serviceTabFromHash("#constructor")).toBeNull();
    expect(serviceTabFromHash("#__proto__")).toBeNull();
    expect(serviceTabFromHash("#toString")).toBeNull();
  });

  it("tab mặc định là Tour và isServiceTab chỉ nhận ba value của tab", () => {
    expect(DEFAULT_SERVICE_TAB).toBe("tour");
    expect(isServiceTab("hotel")).toBe(true);
    expect(isServiceTab("flight")).toBe(true);
    expect(isServiceTab("tour")).toBe(true);
    expect(isServiceTab("tim-khach-san")).toBe(false);
    expect(isServiceTab("")).toBe(false);
  });
});
