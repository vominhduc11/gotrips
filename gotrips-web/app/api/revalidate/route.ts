import { createHash, timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";

const allowedTags = new Set(["destinations", "tours", "departures", "hotels", "flights", "flight-routes", "airports"]);

function isAuthorized(request: Request) {
  const expected = process.env.GOTRIPS_REVALIDATE_SECRET;
  const supplied = request.headers.get("X-Gotrips-Revalidate-Secret");
  if (!expected || !supplied) return false;
  // Băm về cùng độ dài để timingSafeEqual kiểm được cả bí mật sai độ dài.
  const hash = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(hash(expected), hash(supplied));
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) return Response.json({ error: "Không hợp lệ" }, { status: 401 });

  const body: unknown = await request.json().catch(() => null);
  const tags = body && typeof body === "object" && "tags" in body ? body.tags : undefined;
  if (!Array.isArray(tags) || tags.length === 0 || tags.length > allowedTags.size ||
      !tags.every((tag: unknown) => typeof tag === "string" && allowedTags.has(tag))) {
    return Response.json({ error: "Danh sách tag không hợp lệ" }, { status: 400 });
  }

  for (const tag of new Set<string>(tags)) revalidateTag(tag, { expire: 0 });
  return new Response(null, { status: 204 });
}
