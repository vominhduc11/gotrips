"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/** Nút sao chép một giá trị (số tài khoản, số tiền, nội dung chuyển khoản) rồi báo bằng toast. */
export function CopyButton({ value, label }: { value: string; label: string }) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`Đã sao chép ${label}`);
    } catch {
      // Trình duyệt chặn clipboard (HTTP không an toàn, quyền bị từ chối...): giá trị vẫn hiện để khách chép tay.
      toast.error("Không sao chép được, bạn vui lòng chép tay nhé.");
    }
  }

  return (
    <Button variant="ghost" size="icon-sm" aria-label={`Sao chép ${label}`} onClick={copy}>
      <Copy aria-hidden="true" className="size-4" />
    </Button>
  );
}
