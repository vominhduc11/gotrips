import { formatVND } from "@/lib/format";
import type { BankTransferInfo as BankTransferInfoData } from "@/lib/types";
import { CopyButton } from "./CopyButton";

/**
 * Hướng dẫn chuyển khoản thủ công: khách chuyển đúng số tiền với nội dung là MÃ ĐƠN, nhân viên đối chiếu sao kê rồi
 * đánh dấu đã thanh toán. (MVP chưa tích hợp cổng thanh toán.) Tài khoản nhận và nội dung đến từ chi tiết đơn của API.
 */
export function BankTransferInfo({ bank, amount }: { bank: BankTransferInfoData; amount: number }) {
  const rows = [
    { label: "Ngân hàng", value: bank.bankName },
    { label: "Số tài khoản", value: bank.accountNumber, copy: bank.accountNumber.replace(/\s/g, "") },
    { label: "Chủ tài khoản", value: bank.accountName },
    { label: "Số tiền", value: formatVND(amount), copy: String(amount) },
    { label: "Nội dung chuyển khoản", value: bank.content, copy: bank.content, emphasis: true },
  ];

  return (
    <section aria-labelledby="chuyen-khoan-heading" className="rounded-control bg-surface-muted p-4">
      <h3 id="chuyen-khoan-heading" className="font-bold text-ink">
        Hướng dẫn chuyển khoản
      </h3>
      <p className="mt-1 text-sm text-ink-muted">
        Chuyển đúng số tiền và ghi đúng nội dung bên dưới. Nhân viên GoTrips đối chiếu rồi xác nhận đơn cho bạn.
      </p>
      <dl className="mt-3 divide-y divide-line text-sm">
        {rows.map((row) => (
          <div key={row.label} className="py-2">
            <dt className="text-ink-muted">{row.label}</dt>
            <dd className="flex min-h-10 items-center justify-between gap-3">
              <span
                className={
                  row.emphasis ? "font-mono text-base font-bold text-primary-800" : "min-w-0 font-semibold text-ink"
                }
              >
                {row.value}
              </span>
              {row.copy ? <CopyButton value={row.copy} label={row.label.toLowerCase()} /> : null}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
