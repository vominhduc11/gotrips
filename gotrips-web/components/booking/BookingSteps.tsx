import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { BOOKING_STEPS, type BookingStep } from "@/lib/schemas/booking";

/**
 * Thanh tiến trình các bước của trang đặt tour / đặt phòng / đặt vé. Bước hiện tại có `aria-current="step"`; bước đã qua
 * có dấu tích.
 */
export function BookingSteps({ current, label = "Các bước đặt tour" }: { current: BookingStep; label?: string }) {
  const currentIndex = BOOKING_STEPS.findIndex((step) => step.value === current);

  return (
    <nav aria-label={label}>
      <ol className="flex items-center gap-2 sm:gap-3">
        {BOOKING_STEPS.map((step, index) => {
          const done = index < currentIndex;
          const active = index === currentIndex;
          return (
            <li
              key={step.value}
              aria-current={active ? "step" : undefined}
              className="flex min-w-0 flex-1 items-center gap-2"
            >
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-pill text-sm font-bold",
                  active && "bg-primary-700 text-white",
                  done && "bg-primary-100 text-primary-800",
                  !active && !done && "bg-neutral-100 text-ink-muted",
                )}
              >
                {done ? <Check className="size-4" /> : index + 1}
              </span>
              <span className={cn("truncate text-sm", active ? "font-semibold text-ink" : "text-ink-muted")}>
                {step.label}
                {done ? <span className="sr-only"> (đã xong)</span> : null}
              </span>
              {index < BOOKING_STEPS.length - 1 ? (
                <span aria-hidden="true" className="hidden h-px flex-1 bg-line sm:block" />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
