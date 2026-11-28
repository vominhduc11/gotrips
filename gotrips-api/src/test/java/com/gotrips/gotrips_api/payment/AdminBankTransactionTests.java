package com.gotrips.gotrips_api.payment;

import static com.gotrips.gotrips_api.payment.SepayWebhooks.incoming;
import static com.gotrips.gotrips_api.payment.SepayWebhooks.payload;
import static com.gotrips.gotrips_api.support.BookingTestClient.code;
import static com.gotrips.gotrips_api.support.BookingTestClient.tourBooking;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.empty;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.sql.Timestamp;
import java.time.Instant;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.ResultActions;

import com.gotrips.gotrips_api.TestcontainersConfiguration;
import com.gotrips.gotrips_api.support.BookingApiTest;
import com.gotrips.gotrips_api.support.BookingTestClient.Account;

/** /admin/bank-transactions: lọc "cần xử lý" (SQL khớp luật Java), gắn đơn thủ công và đánh dấu đã xử lý. */
class AdminBankTransactionTests extends BookingApiTest {

    private static final long TOUR_TOTAL = 6_980_000;
    private static final String LIST = "/admin/bank-transactions";

    private long departureId;
    private Account owner;
    private Account staff;

    @BeforeEach
    void createCatalog() throws Exception {
        long destination = data.destination("da-lat", "Đà Lạt");
        long tour = data.tour("da-lat-3n2d", destination, true, "ACTIVE");
        departureId = data.departure(tour, "2027-01-23", 3_490_000, null, 30, 0);
        owner = client.customer();
        staff = client.staff();
    }

    private String bookTour() throws Exception {
        return code(postAs("/bookings/tours", owner, tourBooking(departureId, 2)).andExpect(status().isCreated()));
    }

    private void webhook(String body) throws Exception {
        SepayWebhooks.send(mvc, body).andExpect(status().isOk());
        newRequestBoundary();
    }

    private ResultActions list(String... filters) throws Exception {
        var request = get(LIST).header(HttpHeaders.AUTHORIZATION, "Bearer " + staff.token());
        for (int index = 0; index < filters.length; index += 2) {
            request.param(filters[index], filters[index + 1]);
        }
        ResultActions result = mvc.perform(request);
        newRequestBoundary();
        return result;
    }

    private long idOf(long sepayId) {
        return jdbc.queryForObject("SELECT id FROM bank_transactions WHERE sepay_id = ?", Long.class, sepayId);
    }

    /** Mỗi giao dịch một thời điểm nhận khác nhau để thứ tự "mới nhất trước" xác định được. */
    private void receivedAt(long sepayId, String instant) {
        jdbc.update("UPDATE bank_transactions SET received_at = ? WHERE sepay_id = ?",
                Timestamp.from(Instant.parse(instant)), sepayId);
        newRequestBoundary();
    }

    /** Một giao dịch cho mỗi lý do cần xử lý, cộng một giao dịch bình thường. */
    private void createOneOfEachReason() throws Exception {
        String paid = bookTour();
        String overpaid = bookTour();
        String cancelled = bookTour();
        String partlyPaidThenCancelled = bookTour();
        webhook(incoming(1, TOUR_TOTAL, paid, null));
        webhook(incoming(2, TOUR_TOTAL + 200_000, overpaid, null));
        postAs("/admin/bookings/" + cancelled + "/cancel", staff, "{}").andExpect(status().isOk());
        webhook(incoming(3, 50_000, cancelled, null));
        webhook(incoming(4, 70_000, "chuyen tien khong ghi ma", null));
        webhook(payload(5, 90_000, paid, null, "0987654321", "in"));
        webhook(incoming(6, 1_000_000, partlyPaidThenCancelled, null));
        postAs("/admin/bookings/" + partlyPaidThenCancelled + "/cancel", staff, "{}").andExpect(status().isOk());
        for (int id = 1; id <= 6; id++) {
            receivedAt(id, "2026-11-24T18:0%d:00Z".formatted(id));
        }
    }

    @Test
    void needsReviewMatchesTheRuleForEveryReasonAndListsNewestFirst() throws Exception {
        createOneOfEachReason();

        list("needsReview", "true")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(5))
                .andExpect(jsonPath("$.items[*].sepayId", contains(6, 5, 4, 3, 2)))
                .andExpect(jsonPath("$.items[*].reviewReason", contains("BOOKING_CANCELLED", "WRONG_ACCOUNT",
                        "UNMATCHED", "NOT_PAYABLE", "OVERPAID")))
                .andExpect(jsonPath("$.items[*].reviewAmount", contains(1_000_000, 90_000, 70_000, 50_000, 200_000)))
                .andExpect(jsonPath("$.items[*].needsReview", contains(true, true, true, true, true)))
                .andExpect(jsonPath("$.items[1].availableActions", contains("ASSIGN", "RESOLVE")))
                .andExpect(jsonPath("$.items[4].availableActions", contains("RESOLVE")))
                .andExpect(jsonPath("$.items[1].bookingCode").isEmpty())
                .andExpect(jsonPath("$.items[1].accountNumber").value("0987654321"));
        list("needsReview", "false")
                .andExpect(jsonPath("$.items[*].sepayId", contains(1)))
                .andExpect(jsonPath("$.items[0].reviewReason").value("NONE"))
                .andExpect(jsonPath("$.items[0].availableActions", empty()))
                .andExpect(jsonPath("$.items[0].gateway").value("Vietcombank"));
        list().andExpect(jsonPath("$.totalItems").value(6));
    }

    @Test
    void filtersByOutcomeBookingCodeAndLiteralText() throws Exception {
        String bookingCode = bookTour();
        webhook(incoming(11, 1_000_000, "Lan 1 " + bookingCode, null));
        webhook(incoming(12, 2_000_000, "Lan 2 " + bookingCode, null));
        webhook(incoming(13, 70_000, "NGUYEN VAN A 100% chuyen tien", null));

        list("outcome", "UNMATCHED").andExpect(jsonPath("$.items[*].sepayId", contains(13)));
        list("bookingCode", bookingCode.toLowerCase())
                .andExpect(jsonPath("$.items[*].sepayId", containsInAnyOrder(11, 12)));
        list("q", "nguyen van a 100%").andExpect(jsonPath("$.items[*].sepayId", contains(13)));
        list("q", "%").andExpect(jsonPath("$.items[*].sepayId", contains(13)));
        list("q", bookingCode.substring(2)).andExpect(jsonPath("$.totalItems").value(2));
        list("q", "FT261125011").andExpect(jsonPath("$.items[*].sepayId", contains(11)));
        list("size", "1", "page", "99").andExpect(jsonPath("$.page").value(3))
                .andExpect(jsonPath("$.totalPages").value(3));
        list("size", "101").andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors[0].field").value("size"));
    }

    // ---- Gắn đơn ----

    @Test
    void assigningAnUnmatchedTransferPaysAndConfirmsTheBooking() throws Exception {
        String bookingCode = bookTour();
        webhook(incoming(21, TOUR_TOTAL, "NGUYEN VAN A chuyen tien", null));

        postAs(LIST + "/" + idOf(21) + "/assign", staff, "{\"bookingCode\":\" " + bookingCode.toLowerCase() + " \"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.outcome").value("APPLIED"))
                .andExpect(jsonPath("$.bookingCode").value(bookingCode))
                .andExpect(jsonPath("$.appliedAmount").value(TOUR_TOTAL))
                .andExpect(jsonPath("$.needsReview").value(false))
                .andExpect(jsonPath("$.availableActions", empty()))
                .andExpect(jsonPath("$.assignedAt").value(TestcontainersConfiguration.NOW.toString()))
                .andExpect(jsonPath("$.assignedByName").value("Minh Anh"));

        getAs("/bookings/" + bookingCode, owner)
                .andExpect(jsonPath("$.status").value("CONFIRMED"))
                .andExpect(jsonPath("$.paymentStatus").value("PAID"));
    }

    @Test
    void assigningMoneyIntoAnotherAccountToACancelledBookingStillNeedsARefund() throws Exception {
        String bookingCode = bookTour();
        postAs("/admin/bookings/" + bookingCode + "/cancel", staff, "{}").andExpect(status().isOk());
        webhook(payload(22, 300_000, bookingCode, bookingCode, "0987654321", "in"));

        postAs(LIST + "/" + idOf(22) + "/assign", staff, "{\"bookingCode\":\"" + bookingCode + "\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.outcome").value("NOT_PAYABLE"))
                .andExpect(jsonPath("$.reviewReason").value("NOT_PAYABLE"))
                .andExpect(jsonPath("$.reviewAmount").value(300_000))
                .andExpect(jsonPath("$.availableActions", contains("RESOLVE")));
    }

    @Test
    void assignmentIsRejectedForTransfersThatAlreadyHaveABookingOrWereResolved() throws Exception {
        String bookingCode = bookTour();
        webhook(incoming(31, 1_000_000, bookingCode, null));
        webhook(incoming(32, 1_000_000, "khong ma", null));
        postAs(LIST + "/" + idOf(32) + "/resolve", staff, "{\"note\":\"Không phải tiền của khách\"}")
                .andExpect(status().isOk());

        postAs(LIST + "/" + idOf(31) + "/assign", staff, "{\"bookingCode\":\"" + bookingCode + "\"}")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("Giao dịch này đã được gắn vào đơn " + bookingCode + "."));
        postAs(LIST + "/" + idOf(32) + "/assign", staff, "{\"bookingCode\":\"" + bookingCode + "\"}")
                .andExpect(status().isConflict());
    }

    @Test
    void assignmentValidatesTheBookingCode() throws Exception {
        webhook(incoming(41, 1_000_000, "khong ma", null));
        String path = LIST + "/" + idOf(41) + "/assign";

        postAs(path, staff, "{\"bookingCode\":\"GT222222\"}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("bookingCode"))
                .andExpect(jsonPath("$.errors[0].message").value("Không tìm thấy đơn GT222222."));
        postAs(path, staff, "{\"bookingCode\":\"DH123456\"}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("bookingCode"));
        postAs(LIST + "/999999/assign", staff, "{\"bookingCode\":\"GT222222\"}").andExpect(status().isNotFound());
        list("needsReview", "true").andExpect(jsonPath("$.items[0].outcome").value("UNMATCHED"));
    }

    // ---- Đánh dấu đã xử lý ----

    @Test
    void resolvingRecordsWhoAndHowAndTakesTheTransferOutOfTheQueue() throws Exception {
        bookTour();
        webhook(incoming(51, 70_000, "khong ma", null));

        postAs(LIST + "/" + idOf(51) + "/resolve", staff, "{\"note\":\"  Đã hoàn cho khách ngày 25/11  \"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resolvedAt").value(TestcontainersConfiguration.NOW.toString()))
                .andExpect(jsonPath("$.resolvedByName").value("Minh Anh"))
                .andExpect(jsonPath("$.resolutionNote").value("Đã hoàn cho khách ngày 25/11"))
                .andExpect(jsonPath("$.needsReview").value(false))
                .andExpect(jsonPath("$.reviewReason").value("UNMATCHED"))
                .andExpect(jsonPath("$.availableActions", empty()));

        list("needsReview", "true").andExpect(jsonPath("$.totalItems").value(0));
        list("needsReview", "false").andExpect(jsonPath("$.items[*].sepayId", contains(51)));
        postAs(LIST + "/" + idOf(51) + "/resolve", staff, "{\"note\":\"Lần hai\"}").andExpect(status().isConflict());
    }

    @Test
    void resolvingNeedsANoteAndATransferThatNeedsReview() throws Exception {
        String bookingCode = bookTour();
        webhook(incoming(61, 1_000_000, bookingCode, null));
        webhook(incoming(62, 70_000, "khong ma", null));

        postAs(LIST + "/" + idOf(61) + "/resolve", staff, "{\"note\":\"Không cần\"}")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("Giao dịch này không cần xử lý hoặc đã được xử lý."));
        postAs(LIST + "/" + idOf(62) + "/resolve", staff, "{\"note\":\"   \"}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("note"));
        postAs(LIST + "/" + idOf(62) + "/resolve", staff, "{\"note\":\"" + "x".repeat(501) + "\"}")
                .andExpect(status().isBadRequest());
    }

    // ---- Quyền ----

    @Test
    void onlyStaffCanReadOrChangeTransfers() throws Exception {
        webhook(incoming(71, 70_000, "khong ma", null));
        String assign = LIST + "/" + idOf(71) + "/assign";

        getAs(LIST, null).andExpect(status().isUnauthorized());
        getAs(LIST, owner).andExpect(status().isForbidden());
        postAs(assign, null, "{\"bookingCode\":\"GT222222\"}").andExpect(status().isUnauthorized());
        postAs(assign, owner, "{\"bookingCode\":\"GT222222\"}").andExpect(status().isForbidden());
        postAs(LIST + "/" + idOf(71) + "/resolve", owner, "{\"note\":\"x\"}").andExpect(status().isForbidden());
    }
}
