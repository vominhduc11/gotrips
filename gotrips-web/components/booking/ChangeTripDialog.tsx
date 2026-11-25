"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { tripSelectionSchema, type TripSelectionValues } from "@/lib/schemas/booking";
import type { TourDepartureView } from "@/lib/types";
import { TripPriceBreakdown } from "./TripPriceBreakdown";
import { TripSelectionFields } from "./TripSelectionFields";

/**
 * Hộp thoại đổi ngày khởi hành / số khách ngay trong trang đặt tour. Không quay về trang chi tiết vì như vậy sẽ mất
 * thông tin người liên hệ, người đi đã nhập (chúng chỉ nằm trong form, không lên URL).
 *
 * Lựa chọn trong hộp thoại là bản nháp (form riêng): chỉ áp vào đơn khi bấm "Áp dụng"; "Huỷ" thì giữ nguyên.
 * Phải đặt NGOÀI `<form>` của wizard: hộp thoại render qua portal nhưng sự kiện React vẫn nổi bọt theo cây component,
 * nếu nằm trong form của wizard thì submit ở đây sẽ kích hoạt cả submit của wizard.
 */
export function ChangeTripDialog({
  open,
  onOpenChange,
  departures,
  value,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departures: TourDepartureView[];
  /** Lựa chọn đang dùng của đơn — bản nháp bắt đầu từ đây mỗi lần mở. */
  value: TripSelectionValues;
  onApply: (next: TripSelectionValues) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thay đổi chuyến đi</DialogTitle>
          <DialogDescription>
            Thông tin bạn đã nhập vẫn được giữ. Nếu giảm số khách, những người đi ở cuối danh sách sẽ được bỏ bớt.
          </DialogDescription>
        </DialogHeader>
        {/* Nội dung hộp thoại chỉ mount khi mở, nên form nháp luôn khởi tạo lại từ lựa chọn hiện tại. */}
        <ChangeTripForm
          departures={departures}
          value={value}
          onApply={(next) => {
            onApply(next);
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function ChangeTripForm({
  departures,
  value,
  onApply,
}: {
  departures: TourDepartureView[];
  value: TripSelectionValues;
  onApply: (next: TripSelectionValues) => void;
}) {
  const form = useForm<TripSelectionValues>({ resolver: zodResolver(tripSelectionSchema), defaultValues: value });
  const [departureId, guests] = useWatch({ control: form.control, name: ["departureId", "guests"] });
  const selected = departures.find((d) => d.id === departureId && !d.isSoldOut);

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onApply)} noValidate className="space-y-4">
        <TripSelectionFields idPrefix="doi-chuyen" departures={departures} />
        {selected ? (
          <div className="border-t border-line pt-4">
            <TripPriceBreakdown price={selected.price} guests={guests} />
          </div>
        ) : null}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Huỷ</Button>
          </DialogClose>
          <Button type="submit">Áp dụng</Button>
        </DialogFooter>
      </form>
    </FormProvider>
  );
}
