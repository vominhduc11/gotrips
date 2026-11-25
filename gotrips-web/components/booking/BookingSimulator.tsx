"use client";

import { BadgeCheck, Ban, FlaskConical, LoaderCircle, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { simulateBookingAction } from "@/lib/actions/booking";
import type { BookingAction } from "@/lib/booking/transitions";

/**
 * BẢN THỬ NGHIỆM: giả làm nhân viên để demo đủ trạng thái khi chưa có trang quản trị (gotrips-admin).
 * Nút nào không hợp lệ với trạng thái hiện tại thì khoá (server cũng kiểm lại luật). Xoá component này khi có admin.
 */
export function BookingSimulator({ code, available }: { code: string; available: BookingAction[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [running, setRunning] = useState<BookingAction | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);

  function run(action: BookingAction) {
    setRunning(action);
    startTransition(async () => {
      const result = await simulateBookingAction(code, action);
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
      router.refresh(); // đọc lại cookie để trang hiện trạng thái mới
      setRunning(null);
    });
  }

  const spinner = (action: BookingAction) =>
    running === action ? (
      <LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
    ) : null;

  return (
    <section
      aria-labelledby="mo-phong-heading"
      className="rounded-card border border-dashed border-accent-200 bg-accent-50 p-5"
    >
      <h2 id="mo-phong-heading" className="flex items-center gap-2 font-bold text-accent-800">
        <FlaskConical aria-hidden="true" className="size-5" />
        Mô phỏng nhân viên
      </h2>
      <p className="mt-1 text-sm text-accent-800">
        Chỉ có trong bản thử nghiệm, thay cho trang quản trị: đánh dấu đã nhận tiền, rồi mới xác nhận được đơn.
      </p>

      <div className="mt-4 grid gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={pending || !available.includes("mark-paid")}
          aria-busy={running === "mark-paid" || undefined}
          onClick={() => run("mark-paid")}
          className="justify-start"
        >
          {spinner("mark-paid") ?? <Wallet aria-hidden="true" className="size-4" />}
          Đánh dấu đã thanh toán
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={pending || !available.includes("confirm")}
          aria-busy={running === "confirm" || undefined}
          onClick={() => run("confirm")}
          className="justify-start"
        >
          {spinner("confirm") ?? <BadgeCheck aria-hidden="true" className="size-4" />}
          Xác nhận đơn
        </Button>

        <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              disabled={pending || !available.includes("cancel")}
              aria-busy={running === "cancel" || undefined}
              className="justify-start text-danger-700 hover:bg-danger-50"
            >
              {spinner("cancel") ?? <Ban aria-hidden="true" className="size-4" />}
              Huỷ đơn
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Huỷ đơn {code}?</DialogTitle>
              <DialogDescription>
                Đơn bị huỷ sẽ trả lại chỗ cho chuyến đi. Nếu khách đã chuyển tiền, nhân viên cần hoàn tiền thủ công.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Không huỷ</Button>
              </DialogClose>
              <Button
                className="bg-danger-700 hover:bg-danger-700/90"
                onClick={() => {
                  setCancelOpen(false);
                  run("cancel");
                }}
              >
                Huỷ đơn
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
}
