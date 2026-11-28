package com.gotrips.gotrips_api.payment;

import static com.gotrips.gotrips_api.payment.SepayWebhooks.incoming;
import static com.gotrips.gotrips_api.payment.SepayWebhooks.payload;
import static com.gotrips.gotrips_api.support.BookingTestClient.adults;
import static com.gotrips.gotrips_api.support.BookingTestClient.code;
import static com.gotrips.gotrips_api.support.BookingTestClient.flightBooking;
import static com.gotrips.gotrips_api.support.BookingTestClient.hotelBooking;
import static com.gotrips.gotrips_api.support.BookingTestClient.tourBooking;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

import com.gotrips.gotrips_api.TestcontainersConfiguration;
import com.gotrips.gotrips_api.support.BookingApiTest;
import com.gotrips.gotrips_api.support.BookingTestClient.Account;

/** POST /payments/sepay/webhook: xác thực, chống trùng, cộng dồn, tự xác nhận và giao dịch không khớp đơn. */
class SepayWebhookTests extends BookingApiTest {

    /** 2 khách × 3.490.000 đ. */
    private static final long TOUR_TOTAL = 6_980_000;

    private long departureId;
    private long roomTypeId;
    private long scheduleId;
    private Account owner;

    @BeforeEach
    void createCatalog() throws Exception {
        long destination = data.destination("da-lat", "Đà Lạt");
        long tour = data.tour("da-lat-3n2d", destination, true, "ACTIVE");
        departureId = data.departure(tour, "2027-01-23", 3_490_000, null, 20, 5);
        long hotel = data.hotel("khach-san-doi", destination, "ACTIVE", 4.6, 100);
        roomTypeId = data.room(hotel, 1_250_000);
        data.airport("SGN", "Sân bay Tân Sơn Nhất", "TP. Hồ Chí Minh", 1);
        data.airport("HAN", "Sân bay Nội Bài", "Hà Nội", 2);
        data.airline("SV", "Sao Việt Air");
        scheduleId = data.schedule("SV", "SV201", "SGN", "HAN", "06:00", 125, 1_690_000);
        owner = client.customer();
    }

    private String bookTour() throws Exception {
        return code(postAs("/bookings/tours", owner, tourBooking(departureId, 2)).andExpect(status().isCreated()));
    }

    private ResultActions webhook(String body) throws Exception {
        ResultActions result = SepayWebhooks.send(mvc, body);
        newRequestBoundary();
        return result;
    }

    private ResultActions detail(String bookingCode) throws Exception {
        return getAs("/bookings/" + bookingCode, owner).andExpect(status().isOk());
    }

    private Map<String, Object> transaction(long sepayId) {
        return jdbc.queryForMap("""
                SELECT t.outcome, t.amount, t.applied_amount, b.code AS booking_code, t.reference_code,
                       t.transaction_at, t.received_at
                FROM bank_transactions t LEFT JOIN bookings b ON b.id = t.booking_id WHERE t.sepay_id = ?""", sepayId);
    }

    // ---- Tự gắn đơn ----

    @Test
    void aFullTransferPaysAndConfirmsTheBookingAndAnswersExactlyWhatSePayExpects() throws Exception {
        String bookingCode = bookTour();

        webhook(incoming(92704, TOUR_TOTAL, bookingCode + " chuyen tien", bookingCode))
                .andExpect(status().isOk())
                .andExpect(content().string("{\"success\":true}"));

        detail(bookingCode)
                .andExpect(jsonPath("$.status").value("CONFIRMED"))
                .andExpect(jsonPath("$.paymentStatus").value("PAID"))
                .andExpect(jsonPath("$.receivedAmount").value(TOUR_TOTAL))
                .andExpect(jsonPath("$.paidAt").value("2026-11-24T18:30:00Z"))
                .andExpect(jsonPath("$.confirmedAt").value("2026-11-24T18:30:00Z"))
                .andExpect(jsonPath("$.bankTransfer.amountDue").value(0))
                .andExpect(jsonPath("$.bankTransfer.qrImageUrl").isEmpty());
        Map<String, Object> row = transaction(92704);
        assertThat(row).containsEntry("outcome", "APPLIED").containsEntry("applied_amount", TOUR_TOTAL)
                .containsEntry("booking_code", bookingCode).containsEntry("reference_code", "FT2611250" + 92704);
        // 01:29:12 giờ Việt Nam ngày 25/11 = 18:29:12 UTC ngày 24/11.
        assertThat(count("SELECT count(*) FROM bank_transactions WHERE transaction_at = '2026-11-24T18:29:12Z'"))
                .isEqualTo(1);
    }

    @Test
    void sePayRetriesOfTheSameTransactionAreCountedOnce() throws Exception {
        String bookingCode = bookTour();

        for (int attempt = 0; attempt < 3; attempt++) {
            webhook(incoming(1001, 1_000_000, bookingCode, null)).andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true));
        }

        detail(bookingCode).andExpect(jsonPath("$.receivedAmount").value(1_000_000))
                .andExpect(jsonPath("$.paymentStatus").value("UNPAID"));
        assertThat(count("SELECT count(*) FROM bank_transactions WHERE sepay_id = 1001")).isEqualTo(1);
    }

    @Test
    void partialTransfersAddUpAndTheQrCodeAsksOnlyForWhatIsMissing() throws Exception {
        String bookingCode = bookTour();
        detail(bookingCode)
                .andExpect(jsonPath("$.bankTransfer.amountDue").value(TOUR_TOTAL))
                .andExpect(jsonPath("$.bankTransfer.qrImageUrl").value("https://vietqr.app/img?acc=12345678&bank=VCB"
                        + "&amount=" + TOUR_TOTAL + "&des=" + bookingCode + "&template=compact"));

        webhook(incoming(2001, 3_000_000, "Thanh toan " + bookingCode.toLowerCase(), null)).andExpect(status().isOk());
        detail(bookingCode)
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.paymentStatus").value("UNPAID"))
                .andExpect(jsonPath("$.receivedAmount").value(3_000_000))
                .andExpect(jsonPath("$.bankTransfer.amountDue").value(3_980_000))
                .andExpect(jsonPath("$.bankTransfer.qrImageUrl").value(org.hamcrest.Matchers.containsString(
                        "amount=3980000")));
        getAs("/bookings/" + bookingCode + "/payment-status", owner)
                .andExpect(status().isOk())
                .andExpect(content().json("""
                        {"code":"%s","status":"PENDING","paymentStatus":"UNPAID","totalAmount":%d,\
                        "receivedAmount":3000000}""".formatted(bookingCode, TOUR_TOTAL)));

        webhook(incoming(2002, 3_980_000, bookingCode, null)).andExpect(status().isOk());
        detail(bookingCode).andExpect(jsonPath("$.status").value("CONFIRMED"))
                .andExpect(jsonPath("$.paymentStatus").value("PAID"))
                .andExpect(jsonPath("$.receivedAmount").value(TOUR_TOTAL));
        assertThat(transaction(2001)).containsEntry("outcome", "APPLIED");
        assertThat(transaction(2002)).containsEntry("outcome", "APPLIED");
    }

    @Test
    void anOverpaymentPaysTheBookingAndKeepsTheExcessForStaff() throws Exception {
        String bookingCode = bookTour();

        webhook(incoming(3001, TOUR_TOTAL + 500_000, bookingCode, bookingCode)).andExpect(status().isOk());

        detail(bookingCode).andExpect(jsonPath("$.status").value("CONFIRMED"))
                .andExpect(jsonPath("$.receivedAmount").value(TOUR_TOTAL));
        assertThat(transaction(3001)).containsEntry("outcome", "OVERPAID").containsEntry("applied_amount", TOUR_TOTAL);
    }

    @Test
    void moneyForACancelledOrAlreadyPaidBookingIsNotCounted() throws Exception {
        String cancelled = bookTour();
        String paid = bookTour();
        Account staff = client.staff();
        postAs("/admin/bookings/" + cancelled + "/cancel", staff, "{}").andExpect(status().isOk());
        webhook(incoming(4001, TOUR_TOTAL, paid, null)).andExpect(status().isOk());

        webhook(incoming(4002, TOUR_TOTAL, cancelled, null)).andExpect(status().isOk());
        webhook(incoming(4003, 100_000, paid, null)).andExpect(status().isOk());

        detail(cancelled).andExpect(jsonPath("$.status").value("CANCELLED"))
                .andExpect(jsonPath("$.paymentStatus").value("CANCELLED"))
                .andExpect(jsonPath("$.receivedAmount").value(0));
        detail(paid).andExpect(jsonPath("$.receivedAmount").value(TOUR_TOTAL));
        assertThat(transaction(4002)).containsEntry("outcome", "NOT_PAYABLE").containsEntry("applied_amount", 0L)
                .containsEntry("booking_code", cancelled);
        assertThat(transaction(4003)).containsEntry("outcome", "NOT_PAYABLE").containsEntry("booking_code", paid);
    }

    @Test
    void aBookingWhoseServiceHasStartedIsMarkedPaidButLeftForStaffToConfirm() throws Exception {
        String bookingCode = bookTour();
        // Khách chuyển tiền vào đúng ngày khởi hành.
        jdbc.update("UPDATE tour_departures SET departure_date = ? WHERE id = ?",
                java.sql.Date.valueOf(TestcontainersConfiguration.TODAY), departureId);
        newRequestBoundary();

        webhook(incoming(5001, TOUR_TOTAL, bookingCode, null)).andExpect(status().isOk());

        detail(bookingCode).andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.paymentStatus").value("PAID"))
                .andExpect(jsonPath("$.confirmedAt").isEmpty());
    }

    @Test
    void hotelAndFlightBookingsAreConfirmedToo() throws Exception {
        String hotel = code(postAs("/bookings/hotels", owner, hotelBooking(roomTypeId, "2026-12-10", "2026-12-12", 2, 1))
                .andExpect(status().isCreated()));
        String flight = code(postAs("/bookings/flights", owner,
                flightBooking(scheduleId, null, "SGN", "HAN", "2027-06-10", null, "ECONOMY", adults(1)))
                .andExpect(status().isCreated()));

        webhook(incoming(6001, 2_500_000, hotel, null)).andExpect(status().isOk());
        webhook(incoming(6002, 1_690_000, flight, null)).andExpect(status().isOk());

        getAs("/bookings/me", owner).andExpect(jsonPath("$[*].status", containsInAnyOrder("CONFIRMED", "CONFIRMED")))
                .andExpect(jsonPath("$[*].receivedAmount", containsInAnyOrder(2_500_000, 1_690_000)));
    }

    @Test
    void theCodeSePayExtractedIsUsedEvenWhenTheContentLostIt() throws Exception {
        String bookingCode = bookTour();

        webhook(incoming(7001, TOUR_TOTAL, "chuyen tien dat tour", bookingCode)).andExpect(status().isOk());

        assertThat(transaction(7001)).containsEntry("outcome", "APPLIED").containsEntry("booking_code", bookingCode);
    }

    // ---- Không khớp đơn ----

    @Test
    void aTransferWithoutAKnownBookingCodeIsKeptForStaff() throws Exception {
        bookTour();

        webhook(incoming(8001, 500_000, "NGUYEN VAN A chuyen tien", null)).andExpect(status().isOk());
        webhook(incoming(8002, 500_000, "GT222222 chuyen tien", "GT222222")).andExpect(status().isOk());

        assertThat(transaction(8001)).containsEntry("outcome", "UNMATCHED").containsEntry("booking_code", null);
        assertThat(transaction(8002)).containsEntry("outcome", "UNMATCHED");
    }

    @Test
    void moneyIntoAnotherAccountIsRecordedButNotCounted() throws Exception {
        String bookingCode = bookTour();

        webhook(payload(9001, TOUR_TOTAL, bookingCode, bookingCode, "0987654321", "in")).andExpect(status().isOk());

        assertThat(transaction(9001)).containsEntry("outcome", "WRONG_ACCOUNT").containsEntry("booking_code", null);
        detail(bookingCode).andExpect(jsonPath("$.receivedAmount").value(0));
    }

    @Test
    void outgoingTransfersAreAcknowledgedAndIgnored() throws Exception {
        String bookingCode = bookTour();

        webhook(payload(9101, TOUR_TOTAL, bookingCode, bookingCode, SepayWebhooks.ACCOUNT, "out"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.success").value(true));

        assertThat(count("SELECT count(*) FROM bank_transactions")).isZero();
        detail(bookingCode).andExpect(jsonPath("$.receivedAmount").value(0));
    }

    // ---- Xác thực và dữ liệu sai ----

    @Test
    void requestsWithoutAValidSignatureChangeNothing() throws Exception {
        String bookingCode = bookTour();
        String body = incoming(9201, TOUR_TOTAL, bookingCode, bookingCode);

        mvc.perform(post(SepayWebhooks.PATH).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isUnauthorized());
        SepayWebhooks.send(mvc, body, SepayWebhooks.NOW_SECONDS, "khoa-gia-mao").andExpect(status().isUnauthorized());
        SepayWebhooks.send(mvc, body, SepayWebhooks.NOW_SECONDS - 301,
                TestcontainersConfiguration.SEPAY_WEBHOOK_SECRET).andExpect(status().isUnauthorized());
        // Ký đúng một body rồi gửi body khác.
        mvc.perform(post(SepayWebhooks.PATH).contentType(MediaType.APPLICATION_JSON)
                .content(body.replace(String.valueOf(TOUR_TOTAL), "1"))
                .header("X-SePay-Timestamp", String.valueOf(SepayWebhooks.NOW_SECONDS))
                .header("X-SePay-Signature", "sha256=" + SepaySignature.sign(
                        TestcontainersConfiguration.SEPAY_WEBHOOK_SECRET, SepayWebhooks.NOW_SECONDS,
                        body.getBytes(java.nio.charset.StandardCharsets.UTF_8))))
                .andExpect(status().isUnauthorized());

        newRequestBoundary();
        assertThat(count("SELECT count(*) FROM bank_transactions")).isZero();
        detail(bookingCode).andExpect(jsonPath("$.receivedAmount").value(0));
    }

    @Test
    void aSignedButMalformedBodyIsABadRequestWhichAlsoShowsTheEndpointIsPublic() throws Exception {
        webhook("{\"id\":1,\"transferType\":\"in\"}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[*].field", org.hamcrest.Matchers.hasItems("gateway", "transactionDate",
                        "accountNumber", "content", "transferAmount")));
        webhook("khong phai json").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("body"));
        webhook(incoming(9301, 1000, "x", null).replace("2026-11-25 01:29:12", "2026-02-30 01:29:12"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("transactionDate"));
        webhook(incoming(9302, 1000, "x", null).replace("\"transferAmount\":1000", "\"transferAmount\":0"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("transferAmount"));
        assertThat(count("SELECT count(*) FROM bank_transactions")).isZero();
    }

    @Test
    void anOversizedBodyIsRejectedBeforeAnythingElse() throws Exception {
        String huge = "x".repeat(SepayWebhookController.MAX_BODY_BYTES + 1);

        mvc.perform(post(SepayWebhooks.PATH).contentType(MediaType.APPLICATION_JSON).content(huge))
                .andExpect(status().is(413));
    }

    @Test
    void onlyPostIsPublic() throws Exception {
        mvc.perform(get(SepayWebhooks.PATH)).andExpect(status().isUnauthorized());
    }

    // ---- Trạng thái thanh toán cho trang đơn ----

    @Test
    void paymentStatusBelongsToTheOwnerOnly() throws Exception {
        String bookingCode = bookTour();

        getAs("/bookings/" + bookingCode + "/payment-status", client.customer()).andExpect(status().isNotFound());
        getAs("/bookings/khong-hop-le/payment-status", owner).andExpect(status().isNotFound());
        getAs("/bookings/" + bookingCode + "/payment-status", null).andExpect(status().isUnauthorized());
    }
}
