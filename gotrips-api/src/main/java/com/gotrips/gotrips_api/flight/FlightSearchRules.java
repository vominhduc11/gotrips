package com.gotrips.gotrips_api.flight;

import java.time.LocalDate;

import com.gotrips.gotrips_api.common.error.InvalidRequestException;

/**
 * Luật của lượt tìm vé, dùng chung cho tìm chuyến bay và đặt vé. Câu chữ khớp {@code createFlightSearchSchema} ở
 * gotrips-web ({@code lib/schemas/flight-search.ts}): đổi một nơi phải đổi nơi kia.
 */
public final class FlightSearchRules {

    /** Tổng hành khách tối đa một lần tìm/đặt, gồm cả trẻ em và em bé. */
    public static final int MAX_PASSENGERS = 9;

    public static final String SAME_AIRPORT_MESSAGE = "Điểm đến phải khác điểm đi.";
    public static final String PAST_DATE_MESSAGE = "Ngày đi không được ở quá khứ.";
    public static final String NO_ADULT_MESSAGE = "Cần ít nhất 1 người lớn.";
    public static final String TOO_MANY_INFANTS_MESSAGE = "Số em bé không được nhiều hơn số người lớn.";
    public static final String TOO_MANY_PASSENGERS_MESSAGE = "Tổng số hành khách tối đa là " + MAX_PASSENGERS + ".";

    private FlightSearchRules() {
    }

    public static void validateRoute(String from, String to) {
        validateRoute("to", from, to);
    }

    static void validateRoute(String field, String from, String to) {
        if (from.equals(to)) {
            throw new InvalidRequestException(field, SAME_AIRPORT_MESSAGE);
        }
    }

    /** Ngày bay không được ở quá khứ. (Đặt vé còn đòi từ ngày mai, kiểm riêng.) */
    public static void validateNotPast(String field, LocalDate date, LocalDate today) {
        if (date.isBefore(today)) {
            throw new InvalidRequestException(field, PAST_DATE_MESSAGE);
        }
    }

    /**
     * Ít nhất 1 người lớn; mỗi em bé ngồi cùng một người lớn; tổng không quá {@value #MAX_PASSENGERS}.
     *
     * @param adultsField  field nhận lỗi về người lớn / tổng số
     * @param infantsField field nhận lỗi về em bé
     */
    public static void validatePassengerCounts(int adults, int children, int infants, String adultsField,
            String infantsField) {
        if (adults < 1) {
            throw new InvalidRequestException(adultsField, NO_ADULT_MESSAGE);
        }
        if (infants > adults) {
            throw new InvalidRequestException(infantsField, TOO_MANY_INFANTS_MESSAGE);
        }
        if (adults + children + infants > MAX_PASSENGERS) {
            throw new InvalidRequestException(adultsField, TOO_MANY_PASSENGERS_MESSAGE);
        }
    }
}
