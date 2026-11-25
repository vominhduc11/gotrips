"use client";

import { Pencil } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { ContactValues } from "@/lib/schemas/booking";

/** Lưới nhãn – giá trị của các khối ở bước "Xác nhận". */
export const reviewRowClass = "grid gap-1 sm:grid-cols-[10rem_1fr]";

/** Một khối ở bước "Xác nhận": tiêu đề + nút sửa + nội dung. Dùng chung cho đặt tour, đặt phòng, đặt vé. */
export function ReviewSection({
  title,
  onEdit,
  editLabel,
  children,
}: {
  title: string;
  onEdit: () => void;
  editLabel: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-card border border-line bg-surface p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-ink">{title}</h3>
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <Pencil aria-hidden="true" className="size-4" />
          {editLabel}
        </Button>
      </div>
      {children}
    </section>
  );
}

/** Khối "Người liên hệ" (kèm ghi chú nếu có) ở bước "Xác nhận". */
export function ContactReview({ contact, note, onEdit }: { contact: ContactValues; note: string; onEdit: () => void }) {
  return (
    <ReviewSection title="Người liên hệ" editLabel="Sửa thông tin" onEdit={onEdit}>
      <dl className="space-y-2 text-sm">
        <div className={reviewRowClass}>
          <dt className="text-ink-muted">Họ và tên</dt>
          <dd className="font-medium text-ink">{contact.fullName}</dd>
        </div>
        <div className={reviewRowClass}>
          <dt className="text-ink-muted">Email</dt>
          <dd className="font-medium break-all text-ink">{contact.email}</dd>
        </div>
        <div className={reviewRowClass}>
          <dt className="text-ink-muted">Số điện thoại</dt>
          <dd className="font-medium text-ink">{contact.phone}</dd>
        </div>
        {note.trim() ? (
          <div className={reviewRowClass}>
            <dt className="text-ink-muted">Ghi chú</dt>
            <dd className="whitespace-pre-line text-ink">{note.trim()}</dd>
          </div>
        ) : null}
      </dl>
    </ReviewSection>
  );
}
