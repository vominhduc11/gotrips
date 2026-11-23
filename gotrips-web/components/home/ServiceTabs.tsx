"use client";

import { Compass, Hotel, Plane } from "lucide-react";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { subscribeHashNavigation } from "@/lib/hash-navigation";
import { DEFAULT_SERVICE_TAB, isServiceTab, serviceTabFromHash, type ServiceTab } from "./service-tab-hash";
import { TrialNotice } from "./TrialNotice";

// Tab xếp dọc (icon ẩn, badge dưới chữ) trên điện thoại cho đủ rộng để bấm; từ sm trở lên xếp ngang.
// Gạch chân 3px primary-700 dưới tab đang chọn; `after:hidden` tắt gạch chân mặc định của shadcn.
const triggerClass =
  "h-auto flex-1 flex-col gap-1 rounded-none border-0 border-b-[3px] border-transparent px-2 py-3 text-sm font-semibold text-ink-muted -mb-px after:hidden hover:text-ink data-active:border-primary-700 data-active:bg-transparent data-active:text-primary-800 sm:flex-none sm:flex-row sm:gap-2 sm:px-5 sm:text-base";

/**
 * Các loại dịch vụ phía trên ô tìm kiếm: Tour, Khách sạn, Vé máy bay — dùng `Tabs` của shadcn (Radix) nên có sẵn
 * bàn phím (phím mũi tên, Home/End) và ARIA `tablist`/`tab`/`tabpanel`.
 *
 * - Tab đang chọn là state phía client (controlled: `value` + `onValueChange`), người dùng tự bấm tab thì KHÔNG ghi
 *   hash lên URL. Ngược lại, hash trên URL (`#tim-tour`, `#tim-khach-san`, `#tim-ve-may-bay`, xem `service-tab-hash.ts`)
 *   dùng để CHỌN tab, từ menu Header hoặc khi mở thẳng đường dẫn có hash; sau khi chọn thì focus chuyển sang tab đó.
 * - Hash chỉ đọc SAU KHI component đã mount (trong effect), không đọc lúc render và không dùng `searchParams`/
 *   `useSearchParams`: HTML prerender luôn là tab Tour nên không lệch hydration, và Trang chủ vẫn là static shell
 *   (`cacheComponents`). Hash không khớp tab nào thì giữ nguyên tab hiện tại (mặc định là Tour).
 * - Chỉ phần Tabs là client. Ba form được `HeroSearch` (Server Component) dựng sẵn rồi truyền vào qua props,
 *   nên phần dữ liệu (điểm đến, sân bay) vẫn lấy ở server.
 * - `forceMount` + ẩn tab không chọn: giữ nguyên những gì khách đã nhập khi chuyển qua lại giữa các tab
 *   (nếu để Radix gỡ khỏi DOM thì form bị reset mỗi lần đổi tab).
 * - "Sắp ra mắt" vẫn ghi trên Khách sạn và Vé máy bay vì chưa có trang kết quả; submit chỉ hiện toast. Đầu hai panel
 *   này có thêm dòng báo "Bản thử nghiệm" (`TrialNotice`); panel Tour không có.
 * - Thẻ ở thân Trang chủ ("Khách sạn nổi bật", "Chặng bay phổ biến") cũng đi qua cơ chế hash này: `AppLink` tới
 *   `serviceTabHref(tab)` kèm `hashPayload` → component này chọn tab + focus như khi bấm menu Header, còn việc điền
 *   sẵn ô là của từng form (`useSearchPrefill`, nhận cùng sự kiện, tự kiểm tra gói bằng Zod). Component này không
 *   đụng tới payload: form được truyền vào dạng `ReactNode` dựng sẵn từ server nên không có chỗ để truyền giá trị xuống.
 */
export function ServiceTabs({
  tourForm,
  hotelForm,
  flightForm,
}: {
  tourForm: ReactNode;
  hotelForm: ReactNode;
  flightForm: ReactNode;
}) {
  const [tab, setTab] = useState<ServiceTab>(DEFAULT_SERVICE_TAB);
  const triggerRefs = useRef<Partial<Record<ServiceTab, HTMLButtonElement | null>>>({});

  // Hai nguồn chọn tab theo hash, cùng đi qua `selectByHash`:
  //  1. Ngay khi effect chạy: mở thẳng `/#tim-khach-san`, hoặc đi từ trang khác (vd /tours) về Trang chủ. Với
  //     `cacheComponents`, Next KHÔNG unmount Trang chủ khi rời đi mà ẩn bằng `<Activity>` (xem guide "Preserving UI
  //     state"); Activity dọn effect khi ẩn và chạy lại khi hiện, nên lần quay về nào cũng đọc lại hash. URL đã được
  //     router cập nhật ở `useInsertionEffect` của cùng commit, tức trước mọi layout effect, nên `location.hash`
  //     lúc này là hash mới.
  //  2. Sau đó, khi đang ở sẵn Trang chủ mà bấm menu: component không mount lại nên effect trên không chạy; `Link`
  //     dùng `pushState` nên cũng không có `hashchange`. `AppLink` phát sự kiện riêng; `hashchange` gốc (gõ tay
  //     hash, Back/Forward) cũng được nghe.
  // `useLayoutEffect` để tab đúng hiện ra ngay ở khung hình đầu khi Trang chủ được hiện lại, không nháy tab cũ.
  useLayoutEffect(() => {
    function selectByHash(hash: string) {
      const target = serviceTabFromHash(hash);
      if (!target) return;
      setTab(target);
      // Chuyển focus để người dùng bàn phím/trình đọc màn hình biết mình đang ở đâu. `preventScroll` vì việc cuộn
      // đã do Next/trình duyệt lo (tới điểm có id = hash, đã trừ chiều cao header); focus mặc định sẽ cuộn lần nữa.
      triggerRefs.current[target]?.focus({ preventScroll: true });
    }

    selectByHash(window.location.hash);
    return subscribeHashNavigation(selectByHash);
  }, []);

  const panelClass = "p-4 text-base data-[state=inactive]:hidden sm:p-6";

  return (
    <Tabs
      value={tab}
      onValueChange={(next) => {
        if (isServiceTab(next)) setTab(next);
      }}
      className="gap-0"
    >
      <TabsList
        variant="line"
        aria-label="Loại dịch vụ"
        className="h-auto w-full justify-start gap-0 rounded-none border-b border-line px-2 pt-1 group-data-horizontal/tabs:h-auto sm:px-4"
      >
        <TabsTrigger value="tour" ref={(node) => { triggerRefs.current.tour = node; }} className={triggerClass}>
          <span className="flex items-center gap-2">
            <Compass aria-hidden="true" className="hidden size-5 sm:block" />
            Tour
          </span>
        </TabsTrigger>

        <TabsTrigger value="hotel" ref={(node) => { triggerRefs.current.hotel = node; }} className={triggerClass}>
          <span className="flex items-center gap-2">
            <Hotel aria-hidden="true" className="hidden size-5 sm:block" />
            Khách sạn
          </span>
          <Badge variant="soon">Sắp ra mắt</Badge>
        </TabsTrigger>

        <TabsTrigger value="flight" ref={(node) => { triggerRefs.current.flight = node; }} className={triggerClass}>
          <span className="flex items-center gap-2">
            <Plane aria-hidden="true" className="hidden size-5 sm:block" />
            Vé máy bay
          </span>
          <Badge variant="soon">Sắp ra mắt</Badge>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="tour" forceMount className={panelClass}>
        {tourForm}
      </TabsContent>
      <TabsContent value="hotel" forceMount className={panelClass}>
        <TrialNotice />
        {hotelForm}
      </TabsContent>
      <TabsContent value="flight" forceMount className={panelClass}>
        <TrialNotice />
        {flightForm}
      </TabsContent>
    </Tabs>
  );
}
