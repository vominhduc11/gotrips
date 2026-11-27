package com.gotrips.gotrips_api.flight;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalTime;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/** Giá vé và giờ hạ cánh. Bộ số lấy từ test cũ của web ({@code flight-view.test.ts}), nơi các luật này từng nằm. */
class FlightFareCalculatorTests {

    @ParameterizedTest
    @CsvSource({
            "1490000, ECONOMY, 1490000, 1118000, 149000",
            "1490000, PREMIUM_ECONOMY, 2384000, 1788000, 238000",
            "1490000, BUSINESS, 4172000, 3129000, 417000",
            "1490000, FIRST, 6258000, 4694000, 626000",
            "1050000, ECONOMY, 1050000, 788000, 105000",
            // Em bé 10% đúng nửa nghìn (112.500) thì làm tròn lên như Math.round của web.
            "1125000, ECONOMY, 1125000, 844000, 113000",
            "990000, BUSINESS, 2772000, 2079000, 277000" })
    void computesFaresRoundedToTheNearestThousand(long economyFare, CabinClass cabin, long adult, long child,
            long infant) {
        assertThat(FlightFareCalculator.fares(economyFare, cabin))
                .isEqualTo(new FlightFaresResponse(adult, child, infant));
    }

    @ParameterizedTest
    @CsvSource({
            "08:30, 125, 10:35, false",
            "22:30, 130, 00:40, true",
            "23:00, 60, 00:00, true",
            "00:00, 55, 00:55, false" })
    void computesTheArrivalTimeAndWhetherItIsTheNextDay(LocalTime depart, int minutes, LocalTime arrive,
            boolean nextDay) {
        assertThat(FlightFareCalculator.arrival(depart, minutes))
                .isEqualTo(new FlightFareCalculator.Arrival(arrive, nextDay));
    }

    @Test
    void seatsLeftIsNeverNegative() {
        assertThat(FlightSeatInventory.seatsLeft(16, 10)).isEqualTo(6);
        assertThat(FlightSeatInventory.seatsLeft(8, 12)).isZero();
    }
}
