package com.gotrips.gotrips_api.booking;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.sql.SQLException;
import java.time.LocalDate;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;

import org.hibernate.exception.ConstraintViolationException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;

import com.gotrips.gotrips_api.common.error.ConflictException;
import com.gotrips.gotrips_api.common.error.InvalidRequestException;
import com.gotrips.gotrips_api.flight.FlightFaresResponse;

/** Các luật thuần của đơn đặt chỗ: chuyển trạng thái, tuổi hành khách, dòng tính tiền vé, mã đơn. */
class BookingRulesTests {

    private static final LocalDate TODAY = LocalDate.of(2026, 11, 25);
    private static final LocalDate DEPART = LocalDate.of(2027, 6, 10);

    // ---- Chuyển trạng thái ----

    @ParameterizedTest
    @CsvSource({
            "PENDING, UNPAID, MARK_PAID, PENDING, PAID",
            "PENDING, PAID, CONFIRM, CONFIRMED, PAID",
            "PENDING, UNPAID, CANCEL, CANCELLED, CANCELLED",
            "PENDING, PAID, CANCEL, CANCELLED, PAID",
            "CONFIRMED, PAID, CANCEL, CANCELLED, PAID" })
    void appliesAllowedTransitions(BookingStatus status, PaymentStatus payment, BookingTransitions.Action action,
            BookingStatus nextStatus, PaymentStatus nextPayment) {
        assertThat(BookingTransitions.apply(new BookingTransitions.State(status, payment), action))
                .isEqualTo(new BookingTransitions.State(nextStatus, nextPayment));
    }

    @ParameterizedTest
    @CsvSource(delimiter = '|', textBlock = """
            PENDING   | PAID      | MARK_PAID | Chỉ đánh dấu đã thanh toán được cho đơn đang chờ xác nhận và chưa thanh toán.
            CANCELLED | CANCELLED | MARK_PAID | Chỉ đánh dấu đã thanh toán được cho đơn đang chờ xác nhận và chưa thanh toán.
            PENDING   | UNPAID    | CONFIRM   | Chỉ xác nhận được đơn đang chờ xác nhận và đã thanh toán.
            CONFIRMED | PAID      | CONFIRM   | Chỉ xác nhận được đơn đang chờ xác nhận và đã thanh toán.
            CANCELLED | PAID      | CONFIRM   | Chỉ xác nhận được đơn đang chờ xác nhận và đã thanh toán.
            CANCELLED | CANCELLED | CANCEL    | Đơn này đã huỷ trước đó.
            """)
    void rejectsOtherTransitionsWithTheWebMessages(BookingStatus status, PaymentStatus payment,
            BookingTransitions.Action action, String message) {
        assertThatThrownBy(() -> BookingTransitions.apply(new BookingTransitions.State(status, payment), action))
                .isInstanceOfSatisfying(ConflictException.class, e -> {
                    assertThat(e.getMessage()).isEqualTo(message);
                    assertThat(e.getField()).isNull();
                });
    }

    // ---- Tuổi hành khách (tính theo ngày bay chiều đi) ----

    @ParameterizedTest
    @CsvSource({
            "2015-06-10, 12", "2015-06-11, 11", "2025-06-10, 2", "2025-06-11, 1",
            // Sinh ngày 29/02: năm không nhuận thì tới 01/03 mới đủ tuổi (như differenceInYears của web).
            "2024-02-29, 3" })
    void countsFullYearsOnTheFlightDate(LocalDate dateOfBirth, int age) {
        assertThat(PassengerRules.ageOn(dateOfBirth, DEPART)).isEqualTo(age);
    }

    @Test
    void leapDayBirthdaysTurnOlderOnTheFirstOfMarch() {
        LocalDate leapDay = LocalDate.of(2024, 2, 29);
        assertThat(PassengerRules.ageOn(leapDay, LocalDate.of(2026, 2, 28))).isEqualTo(1);
        assertThat(PassengerRules.ageOn(leapDay, LocalDate.of(2026, 3, 1))).isEqualTo(2);
    }

    @ParameterizedTest
    @CsvSource({ "ADULT, 2015-06-10", "CHILD, 2025-06-10", "CHILD, 2015-06-11", "INFANT, 2025-06-11",
            "INFANT, 2026-11-25" })
    void acceptsAgesAtTheBoundaries(PassengerType type, LocalDate dateOfBirth) {
        assertThatCode(() -> PassengerRules.validate(type, dateOfBirth, DEPART, TODAY, "f")).doesNotThrowAnyException();
    }

    @ParameterizedTest
    @CsvSource(delimiter = '|', textBlock = """
            ADULT  | 2015-06-11 | Người lớn phải từ 12 tuổi trở lên vào ngày bay.
            CHILD  | 2025-06-11 | Trẻ em phải từ 2 đến dưới 12 tuổi vào ngày bay.
            CHILD  | 2015-06-10 | Trẻ em phải từ 2 đến dưới 12 tuổi vào ngày bay.
            INFANT | 2025-06-10 | Em bé phải dưới 2 tuổi vào ngày bay.
            INFANT | 2026-11-26 | Ngày sinh không được sau hôm nay.
            CHILD  |            | Vui lòng nhập ngày sinh để kiểm tra độ tuổi.
            INFANT |            | Vui lòng nhập ngày sinh để kiểm tra độ tuổi.
            """)
    void rejectsAgesThatDoNotMatchTheType(PassengerType type, LocalDate dateOfBirth, String message) {
        assertThatThrownBy(() -> PassengerRules.validate(type, dateOfBirth, DEPART, TODAY, "passengers[0].dateOfBirth"))
                .isInstanceOfSatisfying(InvalidRequestException.class, e -> {
                    assertThat(e.getField()).isEqualTo("passengers[0].dateOfBirth");
                    assertThat(e.getMessage()).isEqualTo(message);
                });
    }

    @Test
    void adultsMayOmitTheBirthDate() {
        assertThatCode(() -> PassengerRules.validate(PassengerType.ADULT, null, DEPART, TODAY, "f"))
                .doesNotThrowAnyException();
    }

    // ---- Dòng tính tiền vé ----

    @Test
    void buildsPriceLinesPerSegmentAndPassengerTypeAndSumsThem() {
        List<FlightPriceLineResponse> lines = FlightPricing.priceLines(
                List.of(new FlightFaresResponse(1_490_000, 1_118_000, 149_000),
                        new FlightFaresResponse(1_350_000, 1_013_000, 135_000)),
                List.of(PassengerType.INFANT, PassengerType.ADULT, PassengerType.ADULT));

        assertThat(lines).containsExactly(
                new FlightPriceLineResponse(0, PassengerType.ADULT, 1_490_000, 2, 2_980_000),
                new FlightPriceLineResponse(0, PassengerType.INFANT, 149_000, 1, 149_000),
                new FlightPriceLineResponse(1, PassengerType.ADULT, 1_350_000, 2, 2_700_000),
                new FlightPriceLineResponse(1, PassengerType.INFANT, 135_000, 1, 135_000));
        assertThat(FlightPricing.total(lines)).isEqualTo(5_964_000);
    }

    // ---- Mã đơn ----

    @Test
    void generatesReadableCodesWithoutConfusingCharacters() {
        BookingCodeGenerator generator = new BookingCodeGenerator();
        Set<String> codes = new HashSet<>();
        for (int i = 0; i < 2_000; i++) {
            String code = generator.next();
            assertThat(code).matches("GT[2-9A-HJKMNP-Z]{6}").doesNotContain("0", "O", "1", "I", "L");
            assertThat(BookingCodeGenerator.isValid(code)).isTrue();
            codes.add(code);
        }
        assertThat(codes).hasSizeGreaterThan(1_990);
        assertThat(BookingCodeGenerator.ALPHABET).hasSize(31);
    }

    @ParameterizedTest
    @CsvSource({ "GT7K4Q2M, true", "GT7K4Q2, false", "GT7K4Q2M1, false", "GT7K4Q20, false", "gt7k4q2m, false",
            "XX7K4Q2M, false", "'../auth/me', false" })
    void validatesTheCodeFormat(String code, boolean valid) {
        assertThat(BookingCodeGenerator.isValid(code)).isEqualTo(valid);
    }

    @Test
    void generatesAgainWhenTheCodeIsAlreadyUsed() {
        Deque<String> candidates = new ArrayDeque<>(List.of("GT222222", "GT333333", "GT444444"));

        String code = BookingCodeGenerator.unique(candidates::poll, Set.of("GT222222", "GT333333")::contains);

        assertThat(code).isEqualTo("GT444444");
    }

    @Test
    void givesUpInsteadOfLoopingForeverWhenEveryCodeIsUsed() {
        assertThatThrownBy(() -> BookingCodeGenerator.unique(() -> "GT222222", code -> true))
                .isInstanceOf(IllegalStateException.class);
    }

    // ---- Chạy lại transaction khi UNIQUE chặn mã trùng (hai request sinh cùng một mã) ----

    private static BookingTransaction transaction() {
        PlatformTransactionManager manager = mock(PlatformTransactionManager.class);
        when(manager.getTransaction(any())).thenAnswer(invocation -> new SimpleTransactionStatus());
        return new BookingTransaction(manager);
    }

    private static DataIntegrityViolationException violation(String constraint) {
        return new DataIntegrityViolationException("lỗi",
                new ConstraintViolationException("lỗi", new SQLException(), constraint));
    }

    @Test
    void retriesTheWholeTransactionWhenTheCodeConstraintIsViolated() {
        AtomicInteger attempts = new AtomicInteger();

        String result = transaction().run(() -> {
            if (attempts.incrementAndGet() == 1) {
                throw violation("uq_bookings_code");
            }
            return "ok";
        });

        assertThat(result).isEqualTo("ok");
        assertThat(attempts).hasValue(2);
    }

    @Test
    void doesNotRetryOtherViolations() {
        AtomicInteger attempts = new AtomicInteger();

        assertThatThrownBy(() -> transaction().run(() -> {
            attempts.incrementAndGet();
            throw violation("fk_bookings_user");
        })).isInstanceOf(DataIntegrityViolationException.class);

        assertThat(attempts).hasValue(1);
    }
}
