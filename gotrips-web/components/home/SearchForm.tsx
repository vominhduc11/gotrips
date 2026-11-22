"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { CalendarIcon, MapPinIcon, SearchIcon, UsersIcon } from "@/components/ui/icons";
import { normalizeSearchText } from "@/lib/format";

export interface DestinationOption {
  slug: string;
  name: string;
  region: string;
}

const inputClass =
  "h-12 w-full rounded-control border border-neutral-500 bg-surface px-3 text-base text-ink placeholder:text-neutral-500 hover:border-neutral-700 focus-visible:border-primary-700";

function Field({
  htmlFor,
  label,
  icon,
  children,
}: {
  htmlFor: string;
  label: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-ink">
        {icon}
        {label}
      </label>
      {children}
    </div>
  );
}

/**
 * Form tìm tour. Submit → `/tours?destination=<slug>&date=<yyyy-mm-dd>&guests=<n>`.
 *
 * - Ô điểm đến là input + `<datalist>` gợi ý. Nếu chữ nhập khớp một điểm đến (không phân biệt hoa/thường/dấu)
 *   thì gửi `destination=<slug>` (cùng quy ước với thẻ "Điểm đến phổ biến"); nếu không khớp thì gửi `q=<chữ nhập>`
 *   để trang /tours sau này không nhận phải slug rác.
 * - Tham số trống thì bỏ khỏi URL. Chưa có trang /tours nên hiện sẽ ra trang 404 — đúng với phạm vi prototype.
 */
export function SearchForm({ destinations }: { destinations: DestinationOption[] }) {
  const router = useRouter();
  const [guestsError, setGuestsError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    const guests = Number(form.get("guests"));
    if (!Number.isInteger(guests) || guests < 1) {
      setGuestsError("Vui lòng nhập số khách từ 1 trở lên.");
      document.getElementById("tim-so-khach")?.focus();
      return;
    }
    setGuestsError(null);

    const params = new URLSearchParams();
    const destinationText = String(form.get("q") ?? "").trim();
    if (destinationText) {
      const normalized = normalizeSearchText(destinationText);
      const match = destinations.find(
        (d) => normalizeSearchText(d.name) === normalized || normalizeSearchText(d.slug) === normalized,
      );
      if (match) params.set("destination", match.slug);
      else params.set("q", destinationText);
    }
    const date = String(form.get("date") ?? "");
    if (date) params.set("date", date);
    params.set("guests", String(guests));

    router.push(`/tours?${params.toString()}`);
  }

  return (
    // noValidate: dùng thông báo lỗi tiếng Việt của mình thay cho bong bóng theo ngôn ngữ trình duyệt.
    <form action="/tours" method="get" onSubmit={handleSubmit} noValidate>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_0.6fr_auto] lg:items-start">
        <Field
          htmlFor="tim-diem-den"
          label="Điểm đến"
          icon={<MapPinIcon className="size-4 text-primary-700" />}
        >
          <input
            id="tim-diem-den"
            name="q"
            type="text"
            list="goi-y-diem-den"
            autoComplete="off"
            placeholder="Bạn muốn đi đâu?"
            className={inputClass}
          />
          <datalist id="goi-y-diem-den">
            {destinations.map((destination) => (
              <option key={destination.slug} value={destination.name} label={destination.region} />
            ))}
          </datalist>
        </Field>

        <Field
          htmlFor="tim-ngay-khoi-hanh"
          label="Ngày khởi hành"
          icon={<CalendarIcon className="size-4 text-primary-700" />}
        >
          <input id="tim-ngay-khoi-hanh" name="date" type="date" className={inputClass} />
        </Field>

        <Field htmlFor="tim-so-khach" label="Số khách" icon={<UsersIcon className="size-4 text-primary-700" />}>
          <input
            id="tim-so-khach"
            name="guests"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            defaultValue={2}
            aria-invalid={guestsError ? true : undefined}
            aria-describedby={guestsError ? "loi-so-khach" : undefined}
            className={inputClass}
          />
          {guestsError ? (
            <p id="loi-so-khach" role="alert" className="mt-1.5 text-sm font-medium text-danger-700">
              {guestsError}
            </p>
          ) : null}
        </Field>

        {/* Căn nút với hàng input (bỏ phần label ở lg). */}
        <div className="md:col-span-2 lg:col-span-1 lg:pt-[1.625rem]">
          <Button type="submit" variant="accent" size="lg" className="w-full">
            <SearchIcon className="size-5" />
            Tìm tour
          </Button>
        </div>
      </div>
    </form>
  );
}
