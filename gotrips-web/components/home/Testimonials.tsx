import { Container } from "@/components/common/Container";
import { SectionHeading } from "@/components/common/SectionHeading";
import { StarRating } from "@/components/common/StarRating";
import { getTestimonials } from "@/lib/data/home";

export async function Testimonials() {
  const testimonials = await getTestimonials();

  return (
    <section aria-labelledby="khach-hang-heading" className="bg-primary-50 py-14 sm:py-20">
      <Container>
        <SectionHeading
          id="khach-hang-heading"
          align="center"
          eyebrow="Khách hàng nói gì"
          title="Trải nghiệm thực tế từ khách hàng"
          description="Những chia sẻ sau chuyến đi giúp bạn chọn tour tự tin hơn."
        />

        <ul className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {testimonials.map((testimonial) => {
            // Chữ cái đầu của tên (từ cuối) làm avatar.
            const initial = testimonial.customerName.split(" ").at(-1)?.charAt(0) ?? "?";
            return (
              <li key={testimonial.id}>
                <figure className="flex h-full flex-col rounded-card bg-surface p-6 shadow-card">
                  <StarRating rating={testimonial.rating} />
                  <blockquote className="mt-4 flex-1 text-base leading-7 text-ink">
                    <p>“{testimonial.content}”</p>
                  </blockquote>
                  <figcaption className="mt-6 flex items-center gap-3 border-t border-line pt-4">
                    <span
                      aria-hidden="true"
                      className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-700 text-base font-bold text-white"
                    >
                      {initial}
                    </span>
                    <span className="min-w-0 text-sm">
                      <span className="block font-semibold text-ink">{testimonial.customerName}</span>
                      <span className="block text-ink-muted">{testimonial.customerCity}</span>
                      <span className="mt-0.5 block text-primary-800">Đã đi: {testimonial.tourTitle}</span>
                    </span>
                  </figcaption>
                </figure>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
