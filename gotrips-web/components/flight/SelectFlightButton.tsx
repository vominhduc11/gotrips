"use client";

import { LoaderCircle } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { startFlightBookingAction } from "@/lib/actions/flight-booking";
import type { FlightSearchValues } from "@/lib/schemas/flight-search";

/**
 * Nút chọn chuyến bay cuối cùng (chuyến một chiều, hoặc chuyến về của khứ hồi): gọi Server Action kiểm lựa chọn + phiên
 * rồi chuyển tới trang đặt vé hoặc đăng nhập — cùng lý do với nút "Đặt tour" (`startBookingAction`).
 */
export function SelectFlightButton({
  search,
  outboundId,
  returnId = 0,
  label,
  flightLabel,
  disabled = false,
}: {
  search: FlightSearchValues;
  outboundId: number;
  returnId?: number;
  label: string;
  /** Phân biệt các nút trong danh sách cho trình đọc màn hình, vd "MT113 08:30". */
  flightLabel: string;
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="accent"
      size="md"
      className="w-full md:w-auto"
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      onClick={() =>
        startTransition(async () => {
          const result = await startFlightBookingAction({ search, outboundId, returnId });
          if (!result.ok) toast.error(result.message);
        })
      }
    >
      {pending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" /> : null}
      {label}
      <span className="sr-only"> ({flightLabel})</span>
    </Button>
  );
}
