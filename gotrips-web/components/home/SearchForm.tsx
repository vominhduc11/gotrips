"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Search, Users } from "lucide-react";
import { normalizeSearchText } from "@/lib/format";
import { searchSchema, type SearchFormValues } from "@/lib/schemas/search";

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
 * - Tham số trống thì bỏ khỏi URL. Trang /tours đọc các tham số này (schema ở `lib/schemas/tour-filters.ts`).
 */
export function SearchForm({ destinations }: { destinations: DestinationOption[] }) {
  const router = useRouter();
  // Validate bằng schema Zod dùng chung; khi lỗi, React Hook Form tự focus vào ô lỗi đầu tiên.
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SearchFormValues>({
    resolver: zodResolver(searchSchema),
    defaultValues: { q: "", date: "", guests: 2 },
  });
  const guestsError = errors.guests?.message;

  function onValid({ q: destinationText, date, guests }: SearchFormValues) {
    const params = new URLSearchParams();
    if (destinationText) {
      const normalized = normalizeSearchText(destinationText);
      const match = destinations.find(
        (d) => normalizeSearchText(d.name) === normalized || normalizeSearchText(d.slug) === normalized,
      );
      if (match) params.set("destination", match.slug);
      else params.set("q", destinationText);
    }
    if (date) params.set("date", date);
    params.set("guests", String(guests));

    router.push(`/tours?${params.toString()}`);
  }

  return (
    // noValidate: dùng thông báo lỗi tiếng Việt của mình thay cho bong bóng theo ngôn ngữ trình duyệt.
    <form action="/tours" method="get" onSubmit={handleSubmit(onValid)} noValidate>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_0.6fr_auto] lg:items-start">
        <Field
          htmlFor="tim-diem-den"
          label="Điểm đến"
          icon={<MapPin aria-hidden="true" className="size-4 text-primary-700" />}
        >
          <input
            id="tim-diem-den"
            {...register("q")}
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
          icon={<Calendar aria-hidden="true" className="size-4 text-primary-700" />}
        >
          <input id="tim-ngay-khoi-hanh" {...register("date")} type="date" className={inputClass} />
        </Field>

        <Field htmlFor="tim-so-khach" label="Số khách" icon={<Users aria-hidden="true" className="size-4 text-primary-700" />}>
          <input
            id="tim-so-khach"
            {...register("guests", { valueAsNumber: true })}
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
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
            <Search aria-hidden="true" className="size-5" />
            Tìm tour
          </Button>
        </div>
      </div>
    </form>
  );
}
