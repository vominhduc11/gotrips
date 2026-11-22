import { Badge } from "@/components/ui/Badge";
import { CompassIcon, HotelIcon, PlaneIcon } from "@/components/ui/icons";

const tabBase =
  "flex flex-1 flex-col items-center justify-center gap-1 whitespace-nowrap px-2 py-3 text-sm font-semibold sm:flex-none sm:flex-row sm:gap-2 sm:px-5 sm:text-base";

/**
 * Các loại dịch vụ phía trên ô tìm kiếm. MVP mới có "Tour"; hai mục còn lại bị vô hiệu (`disabled` nên
 * không focus được) và ghi "Sắp ra mắt". Không cần JS nên là Server Component.
 */
export function ServiceTabs() {
  return (
    <div role="group" aria-label="Loại dịch vụ" className="flex border-b border-line px-2 pt-1 sm:px-4">
      <span
        aria-current="true"
        className={`${tabBase} -mb-px border-b-[3px] border-primary-700 text-primary-800`}
      >
        <span className="flex items-center gap-2">
          <CompassIcon className="hidden size-5 sm:block" />
          Tour
        </span>
      </span>

      <button type="button" disabled className={`${tabBase} cursor-not-allowed text-ink-muted`}>
        <span className="flex items-center gap-2">
          <HotelIcon className="hidden size-5 sm:block" />
          Khách sạn
        </span>
        <Badge variant="soon">Sắp ra mắt</Badge>
      </button>

      <button type="button" disabled className={`${tabBase} cursor-not-allowed text-ink-muted`}>
        <span className="flex items-center gap-2">
          <PlaneIcon className="hidden size-5 sm:block" />
          Vé máy bay
        </span>
        <Badge variant="soon">Sắp ra mắt</Badge>
      </button>
    </div>
  );
}
