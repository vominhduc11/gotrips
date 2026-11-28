package com.gotrips.gotrips_api.payment;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/** Đọc mã đơn từ trường code của SePay và từ nội dung chuyển khoản mà ngân hàng thường làm biến dạng. */
class PaymentCodeExtractorTests {

    @Test
    void prefersTheCodeSePayExtractedThenScansTheContent() {
        assertThat(PaymentCodeExtractor.candidates("GT7K4Q2M", "GTABCDEF chuyen tien"))
                .containsExactly("GT7K4Q2M", "GTABCDEF");
    }

    @Test
    void normalizesCaseAndDropsDuplicates() {
        assertThat(PaymentCodeExtractor.candidates(" gt7k4q2m ", "gt7k4q2m chuyen tien")).containsExactly("GT7K4Q2M");
    }

    @Test
    void ignoresASepayCodeOutsideTheBookingAlphabet() {
        // SePay cấu hình "Số và chữ" có thể tách ra cả 0/O/1/I/L, ký tự mà mã đơn không dùng.
        assertThat(PaymentCodeExtractor.candidates("GT0O1IL5", "chuyen tien")).isEmpty();
    }

    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {
            "MBVCB.1234567.GT7K4Q2M.CT tu 0123456789 NGUYEN VAN A | GT7K4Q2M",
            "GT7K4Q2MNGUYEN VAN A chuyen tien | GT7K4Q2M",
            "IBFT NGUYEN VAN A-GT7K4Q2M-thanh toan | GT7K4Q2M",
            "thanh toan don gt7k4q2m | GT7K4Q2M" })
    void findsTheCodeWithoutRequiringWordBoundaries(String content, String expected) {
        assertThat(PaymentCodeExtractor.candidates(null, content)).containsExactly(expected);
    }

    @Test
    void scansOverlappingPositionsSoAStrayPrefixDoesNotHideTheCode() {
        // "GTGT7K4Q" cũng hợp lệ về chữ; lớp gọi chọn mã đầu tiên là đơn có thật.
        assertThat(PaymentCodeExtractor.candidates("", "GTGT7K4Q2M")).containsExactly("GTGT7K4Q", "GT7K4Q2M");
    }

    @Test
    void returnsNothingWithoutACompleteCode() {
        assertThat(PaymentCodeExtractor.candidates(null, null)).isEmpty();
        assertThat(PaymentCodeExtractor.candidates(null, "chuyen tien dat tour")).isEmpty();
        assertThat(PaymentCodeExtractor.candidates(null, "ma don GT7K4")).isEmpty();
    }
}
