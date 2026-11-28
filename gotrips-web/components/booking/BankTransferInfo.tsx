import Image from "next/image";
import { formatVND } from "@/lib/format";
import type { BankTransferInfo as BankTransferInfoData } from "@/lib/types";
import { CopyButton } from "./CopyButton";

/**
 * Hướng dẫn chuyển khoản: khách quét mã VietQR (nếu đã cấu hình) hoặc tự chuyển đúng số tiền với nội dung là MÃ ĐƠN.
 * SePay báo tiền vào cho gotrips-api, API cộng dồn các lần chuyển và tự xác nhận đơn khi đủ. Tài khoản nhận, số tiền còn
 * thiếu và ảnh QR đều đến từ chi tiết đơn của API.
 */
export function BankTransferInfo({ bank, receivedAmount }: { bank: BankTransferInfoData; receivedAmount: number }) {
  const rows = [
    { label: "Ngân hàng", value: bank.bankName },
    { label: "Số tài khoản", value: bank.accountNumber, copy: bank.accountNumber.replace(/\s/g, "") },
    { label: "Chủ tài khoản", value: bank.accountName },
    ...(receivedAmount > 0 ? [{ label: "Đã nhận", value: formatVND(receivedAmount) }] : []),
    {
      label: receivedAmount > 0 ? "Số tiền còn thiếu" : "Số tiền",
      value: formatVND(bank.amountDue),
      copy: String(bank.amountDue),
    },
    { label: "Nội dung chuyển khoản", value: bank.content, copy: bank.content, emphasis: true },
  ];

  return (
    <section aria-labelledby="chuyen-khoan-heading" className="rounded-control bg-surface-muted p-4">
      <h3 id="chuyen-khoan-heading" className="font-bold text-ink">
        Hướng dẫn chuyển khoản
      </h3>
      <p className="mt-1 text-sm text-ink-muted">
        {bank.qrImageUrl ? "Quét mã QR bằng ứng dụng ngân hàng, hoặc chuyển" : "Chuyển"} đúng số tiền và ghi đúng nội
        dung bên dưới. GoTrips tự xác nhận đơn khi nhận đủ tiền, thường chỉ sau vài phút.
      </p>
      {bank.qrImageUrl ? (
        // Ảnh do dịch vụ VietQR của SePay vẽ sẵn: không qua bộ tối ưu ảnh của Next (ảnh nhỏ, mỗi đơn một ảnh khác).
        // Tải ngay thay vì lazy: đây là việc khách cần làm tiếp, và ở màn hẹp khối thanh toán nằm đầu trang.
        <Image
          src={bank.qrImageUrl}
          alt={`Mã VietQR chuyển ${formatVND(bank.amountDue)} vào tài khoản ${bank.accountNumber}, nội dung ${bank.content}`}
          width={240}
          height={240}
          unoptimized
          loading="eager"
          className="mx-auto mt-3 h-auto w-60 rounded-control bg-surface"
        />
      ) : null}
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
