import {
  AirVent,
  Bath,
  Bike,
  Check,
  Coffee,
  Croissant,
  Dumbbell,
  Fence,
  Flame,
  Flower2,
  Map as MapIcon,
  Martini,
  Motorbike,
  Plane,
  Refrigerator,
  SquareParking,
  ToyBrick,
  Trees,
  TreePalm,
  Tv,
  Utensils,
  Vault,
  WavesLadder,
  Wifi,
  type LucideIcon,
} from "lucide-react";

/**
 * Biểu tượng theo `code` tiện ích của gotrips-api (danh mục nằm ở seed `R__seed_catalog.sql`). API chỉ trả code và tên:
 * chọn icon là việc của giao diện.
 */
const AMENITY_ICONS: Record<string, LucideIcon> = {
  pool: WavesLadder,
  beach: TreePalm,
  spa: Flower2,
  gym: Dumbbell,
  restaurant: Utensils,
  bar: Martini,
  breakfast: Croissant,
  wifi: Wifi,
  "kids-club": ToyBrick,
  "garden-bbq": Trees,
  fireplace: Flame,
  parking: SquareParking,
  "airport-shuttle": Plane,
  "motorbike-rental": Motorbike,
  bicycle: Bike,
  "tour-desk": MapIcon,
  "air-conditioning": AirVent,
  tv: Tv,
  minibar: Refrigerator,
  kettle: Coffee,
  bathtub: Bath,
  balcony: Fence,
  safe: Vault,
};

/** Code web chưa biết (API thêm tiện ích trước khi web kịp cập nhật) vẫn hiện được, với dấu tích. */
export function getAmenityIcon(code: string): LucideIcon {
  // `hasOwn` chứ không đọc thẳng: `constructor` là code đúng định dạng slug nhưng có sẵn trên prototype của object.
  return Object.hasOwn(AMENITY_ICONS, code) ? AMENITY_ICONS[code]! : Check;
}
