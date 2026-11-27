import {
  CabinClass,
  PassengerType as ApiPassengerType,
  type FlightOptionResponse,
  type SearchFlightsParams,
} from "@/lib/api/generated/model";
import type { CabinClassValue, FlightOptionView, PassengerType } from "@/lib/types";

/**
 * Chỗ DUY NHẤT ánh xạ giữa giá trị của web (hạng ghế/loại hành khách trên URL và trong form) và enum của API. Khai kiểu
 * `Record` đầy đủ cả hai chiều nên thêm/bớt giá trị ở một bên mà quên bên kia thì TypeScript báo lỗi lúc build.
 */
export const API_CABIN: Record<CabinClassValue, CabinClass> = {
  economy: CabinClass.ECONOMY,
  premiumEconomy: CabinClass.PREMIUM_ECONOMY,
  business: CabinClass.BUSINESS,
  first: CabinClass.FIRST,
};

const WEB_CABIN: Record<CabinClass, CabinClassValue> = {
  ECONOMY: "economy",
  PREMIUM_ECONOMY: "premiumEconomy",
  BUSINESS: "business",
  FIRST: "first",
};

export const API_PASSENGER_TYPE: Record<PassengerType, ApiPassengerType> = {
  adult: ApiPassengerType.ADULT,
  child: ApiPassengerType.CHILD,
  infant: ApiPassengerType.INFANT,
};

const WEB_PASSENGER_TYPE: Record<ApiPassengerType, PassengerType> = {
  ADULT: "adult",
  CHILD: "child",
  INFANT: "infant",
};

export function toWebCabin(cabin: CabinClass): CabinClassValue {
  return WEB_CABIN[cabin];
}

export function toWebPassengerType(type: ApiPassengerType): PassengerType {
  return WEB_PASSENGER_TYPE[type];
}

/** Một lượt hỏi chuyến bay. Số hành khách để API tính `isBookable` (còn đủ ghế cho cả đoàn). */
export interface FlightQuery {
  from: string;
  to: string;
  /** `YYYY-MM-DD`. */
  date: string;
  cabin: CabinClassValue;
  adults: number;
  children: number;
  infants: number;
}

export function toSearchFlightsParams(query: FlightQuery): SearchFlightsParams {
  return {
    from: query.from,
    to: query.to,
    date: query.date,
    cabin: API_CABIN[query.cabin],
    adults: query.adults,
    children: query.children,
    infants: query.infants,
  };
}

export function toFlightOptionView(flight: FlightOptionResponse): FlightOptionView {
  return { ...flight, cabin: toWebCabin(flight.cabin) };
}

/**
 * Id lịch bay lấy từ URL: client do Orval sinh ghép thẳng `/flights/${id}` mà không mã hoá, nên chỉ nhận số nguyên
 * dương (không thì chắc chắn không có chuyến nào, khỏi gọi API).
 */
export function isValidScheduleId(id: number): boolean {
  return Number.isSafeInteger(id) && id > 0;
}
