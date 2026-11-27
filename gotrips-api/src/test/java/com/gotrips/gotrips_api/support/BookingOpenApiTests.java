package com.gotrips.gotrips_api.support;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.hasItems;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

import java.nio.charset.StandardCharsets;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

import com.jayway.jsonpath.JsonPath;

/**
 * Hợp đồng OpenAPI của API vé máy bay và đơn đặt chỗ. Client của web do Orval sinh từ spec này: lệch ở đây là web sinh
 * sai kiểu mà không báo lỗi lúc build API.
 */
class BookingOpenApiTests extends CatalogApiTest {

    private static final String SCHEMAS = "$.components.schemas.";

    @ParameterizedTest
    @CsvSource({
            "/flights, get, searchFlights",
            "/flights/{scheduleId}, get, getFlight",
            "/bookings/tours, post, createTourBooking",
            "/bookings/hotels, post, createHotelBooking",
            "/bookings/flights, post, createFlightBooking",
            "/bookings/me, get, listMyBookings",
            "/bookings/{code}, get, getMyBooking",
            "/admin/bookings, get, listAdminBookings",
            "/admin/bookings/{code}, get, getAdminBooking",
            "/admin/bookings/{code}/mark-paid, post, markBookingPaid",
            "/admin/bookings/{code}/confirm, post, confirmBooking",
            "/admin/bookings/{code}/cancel, post, cancelBooking" })
    void operationIdsMatchTheNamesTheWebClientUses(String path, String method, String operationId) throws Exception {
        mvc.perform(get("/v3/api-docs"))
                .andExpect(jsonPath("$.paths['" + path + "']." + method + ".operationId").value(operationId));
    }

    @Test
    void adminBookingFiltersAndAvailableActionsHaveStableOpenApiTypes() throws Exception {
        String params = "$.paths['/admin/bookings'].get.parameters";
        mvc.perform(get("/v3/api-docs"))
                .andExpect(jsonPath(params + "[?(@.name=='page')].schema.type").value("integer"))
                .andExpect(jsonPath(params + "[?(@.name=='size')].schema.type").value("integer"))
                .andExpect(jsonPath(params + "[?(@.name=='createdFrom')].schema.format").value("date"))
                .andExpect(jsonPath(params + "[?(@.name=='customerId')].schema.format").value("uuid"))
                .andExpect(jsonPath(SCHEMAS + "AdminBookingDetailResponse.required", hasItems("customer", "availableActions")))
                .andExpect(jsonPath(SCHEMAS + "AdminBookingPageResponse.required", hasItems("items", "page", "totalItems")));
    }

    @ParameterizedTest
    @CsvSource({ "/bookings/tours, 201", "/bookings/hotels, 201", "/bookings/flights, 201" })
    void creationOnlyDeclaresTheCreatedResponse(String path, String status) throws Exception {
        mvc.perform(get("/v3/api-docs"))
                .andExpect(jsonPath("$.paths['" + path + "'].post.responses.keys()", containsInAnyOrder(status)));
    }

    @ParameterizedTest
    @ValueSource(strings = { "/flights", "/flights/{scheduleId}" })
    void flightParametersHaveTheRequirednessAndTypesTheWebClientExpects(String path) throws Exception {
        String parameters = "$.paths['" + path + "'].get.parameters";

        mvc.perform(get("/v3/api-docs"))
                .andExpect(jsonPath(parameters + "[?(@.required==true)].name", hasItems("from", "to", "date")))
                .andExpect(jsonPath(parameters + "[?(@.name=='from')].schema.type").value("string"))
                .andExpect(jsonPath(parameters + "[?(@.name=='date')].schema.format").value("date"))
                .andExpect(jsonPath(parameters + "[?(@.name=='date')].schema.type").value("string"))
                .andExpect(jsonPath(parameters + "[?(@.name=='adults')].schema.type").value("integer"))
                .andExpect(jsonPath(parameters + "[?(@.name=='adults')].schema.minimum").value(1))
                .andExpect(jsonPath(parameters + "[?(@.name=='adults')].required").value(false))
                .andExpect(jsonPath(parameters + "[?(@.name=='children')].schema.type").value("integer"))
                .andExpect(jsonPath(parameters + "[?(@.name=='infants')].schema.type").value("integer"))
                .andExpect(jsonPath(parameters + "[?(@.name=='cabin')].required").value(false));
    }

    @Test
    void cabinIsASharedUpperCaseEnum() throws Exception {
        mvc.perform(get("/v3/api-docs"))
                .andExpect(jsonPath(SCHEMAS + "CabinClass.enum",
                        containsInAnyOrder("ECONOMY", "PREMIUM_ECONOMY", "BUSINESS", "FIRST")))
                .andExpect(jsonPath(SCHEMAS + "BookingKind.enum", containsInAnyOrder("TOUR", "HOTEL", "FLIGHT")))
                .andExpect(jsonPath(SCHEMAS + "FlightOptionResponse.required", hasSize(14)));
    }

    @ParameterizedTest
    @ValueSource(strings = { "BookingSummaryResponse", "BookingDetailResponse" })
    void bookingResponsesAreFlatWithOptionalNonNullableBlocks(String schema) throws Exception {
        String path = SCHEMAS + schema;

        mvc.perform(get("/v3/api-docs"))
                // Ba khối theo loại KHÔNG bắt buộc (bỏ khỏi JSON khi null), và là $ref thuần (không "nullable").
                .andExpect(jsonPath(path + ".required", not(hasItem("tour"))))
                .andExpect(jsonPath(path + ".required", not(hasItem("hotel"))))
                .andExpect(jsonPath(path + ".required", not(hasItem("flight"))))
                .andExpect(jsonPath(path + ".required",
                        hasItems("code", "kind", "status", "paymentStatus", "totalAmount", "createdAt")))
                .andExpect(jsonPath(path + ".properties.tour['$ref']")
                        .value("#/components/schemas/TourBookingResponse"))
                .andExpect(jsonPath(path + ".properties.hotel['$ref']")
                        .value("#/components/schemas/HotelBookingResponse"))
                .andExpect(jsonPath(path + ".properties.flight['$ref']")
                        .value("#/components/schemas/FlightBookingResponse"))
                .andExpect(jsonPath(path + ".properties.tour.type").doesNotExist())
                .andExpect(jsonPath(path + ".oneOf").doesNotExist());
    }

    @Test
    void detailNullableFieldsAreRequiredPrimitives() throws Exception {
        String detail = SCHEMAS + "BookingDetailResponse";

        mvc.perform(get("/v3/api-docs"))
                .andExpect(jsonPath(detail + ".required",
                        hasItems("contact", "note", "paidAt", "confirmedAt", "cancelledAt", "bankTransfer")))
                .andExpect(jsonPath(detail + ".properties.note.type", containsInAnyOrder("string", "null")))
                .andExpect(jsonPath(detail + ".properties.paidAt.type", containsInAnyOrder("string", "null")))
                .andExpect(jsonPath(SCHEMAS + "FlightBookingResponse.properties.imageUrl.type",
                        containsInAnyOrder("string", "null")))
                .andExpect(jsonPath(SCHEMAS + "BookingPassengerResponse.properties.dateOfBirth.type",
                        containsInAnyOrder("string", "null")));
    }

    @Test
    void noSchemaUsesOneOfOrANullTypedReference() throws Exception {
        String spec = mvc.perform(get("/v3/api-docs")).andReturn().getResponse()
                .getContentAsString(StandardCharsets.UTF_8);

        assertThat(spec).doesNotContain("\"oneOf\"");
        // springdoc sinh {"type":"null","$ref":...} khi khai nullable trên object: Orval sinh sai kiểu.
        assertThat(JsonPath.<java.util.List<?>>read(spec, "$..[?(@.$ref && @.type)]")).isEmpty();
        assertThat(JsonPath.<java.util.List<?>>read(spec, "$..[?(@.type=='null')]")).isEmpty();
    }
}
