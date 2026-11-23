import { afterEach, describe, expect, it, vi } from "vitest";
import {
  announceHashNavigation,
  getHashFromHref,
  scrollToHashTarget,
  subscribeHashNavigation,
} from "./hash-navigation";

describe("getHashFromHref", () => {
  it("lấy hash từ href dạng chuỗi, giữ dấu # đứng đầu", () => {
    expect(getHashFromHref("/#tim-khach-san")).toBe("#tim-khach-san");
    expect(getHashFromHref("/tours?page=2#ket-qua")).toBe("#ket-qua");
    expect(getHashFromHref("#tim-tour")).toBe("#tim-tour");
  });

  it("không có hash (hoặc hash rỗng) thì trả chuỗi rỗng", () => {
    expect(getHashFromHref("/")).toBe("");
    expect(getHashFromHref("/tours")).toBe("");
    expect(getHashFromHref("/tours#")).toBe("");
  });

  it("nhận cả UrlObject, có hoặc không có # đứng đầu", () => {
    expect(getHashFromHref({ hash: "tim-ve-may-bay" })).toBe("#tim-ve-may-bay");
    expect(getHashFromHref({ hash: "#tim-ve-may-bay" })).toBe("#tim-ve-may-bay");
    expect(getHashFromHref({ hash: null })).toBe("");
    expect(getHashFromHref({})).toBe("");
  });
});

describe("scrollToHashTarget", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  /** jsdom không cài `scrollIntoView` nên gắn hàm giả lên chính phần tử để biết nó có được gọi hay không. */
  function addTarget(id: string) {
    const element = document.createElement("div");
    element.id = id;
    element.scrollIntoView = vi.fn();
    document.body.append(element);
    return element;
  }

  it("cuộn tới phần tử có id bằng hash, có hoặc không có dấu # đứng đầu", () => {
    const target = addTarget("tim-khach-san");

    scrollToHashTarget("#tim-khach-san");
    scrollToHashTarget("tim-khach-san");

    expect(target.scrollIntoView).toHaveBeenCalledTimes(2);
  });

  it("chỉ cuộn tới đúng phần tử, không đụng phần tử khác", () => {
    const hotel = addTarget("tim-khach-san");
    const flight = addTarget("tim-ve-may-bay");

    scrollToHashTarget("#tim-ve-may-bay");

    expect(flight.scrollIntoView).toHaveBeenCalledTimes(1);
    expect(hotel.scrollIntoView).not.toHaveBeenCalled();
  });

  it("giải mã %-escape trước khi tìm id (hash có chữ Việt)", () => {
    const target = addTarget("tìm-đường");

    scrollToHashTarget(`#${encodeURIComponent("tìm-đường")}`);

    expect(target.scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it("hash có % hỏng không ném lỗi, tìm theo nguyên chuỗi", () => {
    const target = addTarget("100%");

    expect(() => scrollToHashTarget("#100%")).not.toThrow();
    expect(target.scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it("hash rỗng, chỉ có # hoặc không có phần tử nào khớp thì không làm gì và không ném lỗi", () => {
    const target = addTarget("tim-tour");

    expect(() => {
      scrollToHashTarget("");
      scrollToHashTarget("#");
      scrollToHashTarget("#khong-co");
    }).not.toThrow();
    expect(target.scrollIntoView).not.toHaveBeenCalled();
  });
});

describe("subscribeHashNavigation", () => {
  const cleanups: Array<() => void> = [];
  afterEach(() => {
    while (cleanups.length) cleanups.pop()?.();
    window.history.replaceState(null, "", "/");
  });

  function subscribe(listener: (hash: string) => void) {
    const unsubscribe = subscribeHashNavigation(listener);
    cleanups.push(unsubscribe);
    return unsubscribe;
  }

  it("nhận hash do announceHashNavigation phát (điều hướng qua AppLink)", () => {
    const listener = vi.fn();
    subscribe(listener);

    announceHashNavigation("#tim-khach-san");

    expect(listener).toHaveBeenCalledExactlyOnceWith("#tim-khach-san");
  });

  it("kèm payload thì listener nhận thêm đối số thứ hai, đúng giá trị đã phát", () => {
    const listener = vi.fn();
    subscribe(listener);

    announceHashNavigation("#tim-khach-san", { destination: "da-lat" });

    expect(listener).toHaveBeenCalledExactlyOnceWith("#tim-khach-san", { destination: "da-lat" });
  });

  it("không kèm payload thì listener chỉ nhận đúng một đối số (không phải thêm `undefined`)", () => {
    const listener = vi.fn();
    subscribe(listener);

    announceHashNavigation("#tim-ve-may-bay");

    expect(listener.mock.calls).toEqual([["#tim-ve-may-bay"]]);
  });

  it("payload giả (null, chuỗi, mảng) vẫn được chuyển nguyên cho listener để nơi nhận tự kiểm tra", () => {
    const listener = vi.fn();
    subscribe(listener);

    announceHashNavigation("#tim-khach-san", null);
    announceHashNavigation("#tim-khach-san", "<script>");
    announceHashNavigation("#tim-khach-san", ["da-lat"]);

    expect(listener.mock.calls).toEqual([
      ["#tim-khach-san", null],
      ["#tim-khach-san", "<script>"],
      ["#tim-khach-san", ["da-lat"]],
    ]);
  });

  it("nhận hash hiện tại của URL khi trình duyệt phát hashchange gốc", () => {
    const listener = vi.fn();
    subscribe(listener);

    window.history.replaceState(null, "", "/#tim-ve-may-bay");
    window.dispatchEvent(new Event("hashchange"));

    expect(listener).toHaveBeenCalledExactlyOnceWith("#tim-ve-may-bay");
  });

  it("sau khi huỷ đăng ký thì không nhận thêm gì", () => {
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);

    unsubscribe();
    announceHashNavigation("#tim-tour");
    window.dispatchEvent(new Event("hashchange"));

    expect(listener).not.toHaveBeenCalled();
  });
});
