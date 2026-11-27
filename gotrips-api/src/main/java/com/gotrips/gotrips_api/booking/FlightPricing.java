package com.gotrips.gotrips_api.booking;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.gotrips.gotrips_api.flight.FlightFaresResponse;

/**
 * Các dòng tính tiền của đơn vé: mỗi chặng × mỗi loại hành khách có mặt. Hàm thuần, dùng cả lúc tạo đơn (tổng tiền =
 * tổng các dòng) lẫn lúc đọc đơn (từ giá đã chốt), nên hai nơi luôn khớp nhau.
 */
public final class FlightPricing {

    private FlightPricing() {
    }

    /**
     * @param segmentFares giá đã chốt của từng chặng, theo thứ tự (đi, về)
     * @param passengers   loại của từng hành khách
     * @return dòng theo chặng, trong mỗi chặng theo thứ tự người lớn → trẻ em → em bé (bỏ loại không có ai)
     */
    public static List<FlightPriceLineResponse> priceLines(List<FlightFaresResponse> segmentFares,
            List<PassengerType> passengers) {
        Map<PassengerType, Long> counts = passengers.stream()
                .collect(Collectors.groupingBy(Function.identity(), Collectors.counting()));
        List<FlightPriceLineResponse> lines = new ArrayList<>();
        for (int segment = 0; segment < segmentFares.size(); segment++) {
            for (PassengerType type : PassengerType.values()) {
                int quantity = counts.getOrDefault(type, 0L).intValue();
                if (quantity == 0) {
                    continue;
                }
                long unitPrice = fareOf(segmentFares.get(segment), type);
                lines.add(new FlightPriceLineResponse(segment, type, unitPrice, quantity, unitPrice * quantity));
            }
        }
        return lines;
    }

    public static long total(List<FlightPriceLineResponse> lines) {
        return lines.stream().mapToLong(FlightPriceLineResponse::amount).sum();
    }

    private static long fareOf(FlightFaresResponse fares, PassengerType type) {
        return switch (type) {
            case ADULT -> fares.adult();
            case CHILD -> fares.child();
            case INFANT -> fares.infant();
        };
    }
}
