import { BedDouble, CalendarDays, Clock, Compass, Plane, Users, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import type { BookingHighlight } from "@/lib/types";

const ICONS: Record<BookingHighlight["icon"], LucideIcon> = {
  calendar: CalendarDays,
  users: Users,
  bed: BedDouble,
  plane: Plane,
  clock: Clock,
  compass: Compass,
};

/** Các dòng thông tin ngắn của một đơn (ngày, số khách, phòng, chuyến bay...) — nội dung do `lib/data/booking-view.ts` dựng. */
export function BookingHighlights({
  highlights,
  className,
  iconClassName = "size-4 shrink-0",
}: {
  highlights: BookingHighlight[];
  className?: string;
  iconClassName?: string;
}) {
  return (
    <ul className={cn("flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-muted", className)}>
      {highlights.map((item) => {
        const Icon = ICONS[item.icon];
        return (
          <li key={`${item.icon}-${item.text}`} className="flex items-center gap-1.5">
            <Icon aria-hidden="true" className={iconClassName} />
            {item.text}
          </li>
        );
      })}
    </ul>
  );
}
