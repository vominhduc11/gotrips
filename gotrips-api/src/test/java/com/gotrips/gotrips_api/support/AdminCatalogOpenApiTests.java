package com.gotrips.gotrips_api.support;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.hasItems;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/**
 * Hợp đồng OpenAPI của API quản trị danh mục. Client của gotrips-admin do Orval sinh từ spec này (lọc theo tag bắt đầu
 * bằng "Quản trị "), còn client của web loại đúng các tag đó.
 */
class AdminCatalogOpenApiTests extends CatalogApiTest {

    private static final String SCHEMAS = "$.components.schemas.";

    @ParameterizedTest
    @CsvSource({
            "/admin/destinations, get, listAdminDestinations, Quản trị điểm đến, 200",
            "/admin/destinations, post, createAdminDestination, Quản trị điểm đến, 201",
            "/admin/destinations/{id}, put, updateAdminDestination, Quản trị điểm đến, 200",
            "/admin/destinations/{id}, delete, deleteAdminDestination, Quản trị điểm đến, 204",
            "/admin/tours, get, listAdminTours, Quản trị tour, 200",
            "/admin/tours, post, createAdminTour, Quản trị tour, 201",
            "/admin/tours/{id}, get, getAdminTour, Quản trị tour, 200",
            "/admin/tours/{id}, put, updateAdminTour, Quản trị tour, 200",
            "/admin/tours/{id}, delete, deleteAdminTour, Quản trị tour, 204",
            "/admin/tours/{id}/status, patch, updateAdminTourStatus, Quản trị tour, 200",
            "/admin/tours/{id}/restore, post, restoreAdminTour, Quản trị tour, 200",
            "/admin/tours/{id}/departures, get, listAdminDepartures, Quản trị chuyến khởi hành, 200",
            "/admin/tours/{id}/departures, post, createAdminDeparture, Quản trị chuyến khởi hành, 201",
            "/admin/departures/{id}, put, updateAdminDeparture, Quản trị chuyến khởi hành, 200",
            "/admin/departures/{id}, delete, deleteAdminDeparture, Quản trị chuyến khởi hành, 204",
            "/admin/departures/{id}/close, post, closeAdminDeparture, Quản trị chuyến khởi hành, 200",
            "/admin/departures/{id}/reopen, post, reopenAdminDeparture, Quản trị chuyến khởi hành, 200",
            "/admin/hotels, get, listAdminHotels, Quản trị khách sạn, 200",
            "/admin/hotels, post, createAdminHotel, Quản trị khách sạn, 201",
            "/admin/hotels/{id}, get, getAdminHotel, Quản trị khách sạn, 200",
            "/admin/hotels/{id}, put, updateAdminHotel, Quản trị khách sạn, 200",
            "/admin/hotels/{id}, delete, deleteAdminHotel, Quản trị khách sạn, 204",
            "/admin/hotels/{id}/status, patch, updateAdminHotelStatus, Quản trị khách sạn, 200",
            "/admin/hotels/{id}/restore, post, restoreAdminHotel, Quản trị khách sạn, 200",
            "/admin/hotels/{id}/room-types, get, listAdminRoomTypes, Quản trị loại phòng, 200",
            "/admin/hotels/{id}/room-types, post, createAdminRoomType, Quản trị loại phòng, 201",
            "/admin/room-types/{id}, put, updateAdminRoomType, Quản trị loại phòng, 200",
            "/admin/room-types/{id}, delete, deleteAdminRoomType, Quản trị loại phòng, 204",
            "/admin/amenities, get, listAdminAmenities, Quản trị tiện ích, 200" })
    void everyOperationHasAStableIdTagAndOnlyItsSuccessResponse(String path, String method, String operationId,
            String tag, String successStatus) throws Exception {
        String operation = "$.paths['" + path + "']." + method;
        mvc.perform(get("/v3/api-docs"))
                .andExpect(jsonPath(operation + ".operationId").value(operationId))
                .andExpect(jsonPath(operation + ".tags", contains(tag)))
                .andExpect(jsonPath(operation + ".responses.keys()", containsInAnyOrder(successStatus)));
    }

    @Test
    void tourFiltersHaveTheTypesTheAdminClientExpects() throws Exception {
        String params = "$.paths['/admin/tours'].get.parameters";
        mvc.perform(get("/v3/api-docs"))
                .andExpect(jsonPath(params + "[?(@.name=='page')].schema.type").value("integer"))
                .andExpect(jsonPath(params + "[?(@.name=='size')].schema.type").value("integer"))
                .andExpect(jsonPath(params + "[?(@.name=='destinationId')].schema.type").value("integer"))
                .andExpect(jsonPath(params + "[?(@.name=='featured')].schema.type").value("boolean"))
                .andExpect(jsonPath(params + "[?(@.name=='status')].schema.enum[*]",
                        containsInAnyOrder("ACTIVE", "HIDDEN", "DELETED")))
                .andExpect(jsonPath(params + "[?(@.name=='sort')].schema.enum[*]",
                        containsInAnyOrder("NEWEST", "OLDEST", "TITLE_ASC", "TITLE_DESC")));
    }

    @ParameterizedTest
    @CsvSource({ "/admin/hotels, get", "/admin/hotels, post", "/admin/hotels/{id}, put",
            "/admin/room-types/{id}, delete", "/admin/amenities, get" })
    void hotelOperationsDeclareBothAdminSecuritySchemes(String path, String method) throws Exception {
        String security = "$.paths['" + path + "']." + method + ".security";
        mvc.perform(get("/v3/api-docs"))
                .andExpect(jsonPath(security + "[*].bearerAuth").exists())
                .andExpect(jsonPath(security + "[*].adminCookieAuth").exists());
    }

    @Test
    void hotelFiltersHaveTheTypesTheAdminClientExpects() throws Exception {
        String params = "$.paths['/admin/hotels'].get.parameters";
        mvc.perform(get("/v3/api-docs"))
                .andExpect(jsonPath(params + "[?(@.name=='page')].schema.type").value("integer"))
                .andExpect(jsonPath(params + "[?(@.name=='size')].schema.type").value("integer"))
                .andExpect(jsonPath(params + "[?(@.name=='destinationId')].schema.type").value("integer"))
                .andExpect(jsonPath(params + "[?(@.name=='status')].schema.enum[*]",
                        containsInAnyOrder("ACTIVE", "HIDDEN", "DELETED")))
                .andExpect(jsonPath(params + "[?(@.name=='sort')].schema.enum[*]",
                        containsInAnyOrder("NEWEST", "OLDEST", "NAME_ASC", "NAME_DESC")));
    }

    @Test
    void hotelSchemasMarkRequiredFieldsAndOnlyPrimitivesAsNullable() throws Exception {
        mvc.perform(get("/v3/api-docs"))
                .andExpect(jsonPath(SCHEMAS + "AdminHotelSummaryResponse.required",
                        hasItems("minPricePerNight", "roomTypeCount", "visibleOnWebsite")))
                .andExpect(jsonPath(SCHEMAS + "AdminHotelSummaryResponse.properties.minPricePerNight.type[*]",
                        containsInAnyOrder("integer", "null")))
                .andExpect(jsonPath(SCHEMAS + "AdminHotelDetailResponse.required", hasItems("amenities", "images",
                        "checkInTime", "checkOutTime", "rating", "reviewCount", "minPricePerNight",
                        "visibleOnWebsite")))
                .andExpect(jsonPath(SCHEMAS + "AdminHotelDetailResponse.properties.minPricePerNight.type[*]",
                        containsInAnyOrder("integer", "null")))
                .andExpect(jsonPath(SCHEMAS + "AdminHotelDetailResponse.properties.checkInTime.type").value("string"))
                .andExpect(jsonPath(SCHEMAS + "AdminCreateHotelRequest.required", hasItems("slug", "destinationId",
                        "starRating", "amenityCodes", "images", "checkInTime", "checkOutTime")))
                .andExpect(jsonPath(SCHEMAS + "AdminRoomTypeRequest.required",
                        hasItems("name", "pricePerNight", "totalRooms", "amenityCodes", "images")))
                .andExpect(jsonPath(SCHEMAS + "AdminImageRequest.required", hasItems("url", "alt")))
                .andExpect(jsonPath(SCHEMAS + "AdminRoomTypeResponse.required",
                        hasItems("minimumTotalRooms", "deletable", "amenities", "images", "totalRooms")))
                .andExpect(jsonPath(SCHEMAS + "AdminAmenityResponse.properties.scope.enum[*]",
                        containsInAnyOrder("HOTEL", "ROOM", "BOTH")))
                .andExpect(jsonPath(SCHEMAS + "AdminHotelStatusRequest.properties.status.enum[*]",
                        containsInAnyOrder("ACTIVE", "HIDDEN")))
                .andExpect(jsonPath(SCHEMAS + "AdminCreateHotelRequest.properties.status.enum[*]",
                        containsInAnyOrder("ACTIVE", "HIDDEN")));
    }

    @Test
    void settableStatusExcludesDeleted() throws Exception {
        mvc.perform(get("/v3/api-docs"))
                .andExpect(jsonPath(SCHEMAS + "AdminTourStatusRequest.properties.status.enum[*]",
                        containsInAnyOrder("ACTIVE", "HIDDEN")))
                .andExpect(jsonPath(SCHEMAS + "AdminCreateTourRequest.properties.status.enum[*]",
                        containsInAnyOrder("ACTIVE", "HIDDEN")));
    }

    @Test
    void responseFieldsAreRequiredAndNullablePrimitivesStayNullable() throws Exception {
        mvc.perform(get("/v3/api-docs"))
                .andExpect(jsonPath(SCHEMAS + "AdminDestinationResponse.required",
                        hasItems("id", "slug", "tourCount", "hotelCount")))
                .andExpect(jsonPath(SCHEMAS + "AdminTourDetailResponse.required",
                        hasItems("status", "rating", "reviewCount", "openDepartureCount")))
                .andExpect(jsonPath(SCHEMAS + "AdminTourSummaryResponse.required",
                        hasItems("nextDepartureDate", "upcomingDepartureCount", "remainingSeats")))
                .andExpect(jsonPath(SCHEMAS + "AdminTourSummaryResponse.properties.nextDepartureDate.type[*]",
                        containsInAnyOrder("string", "null")))
                .andExpect(jsonPath(SCHEMAS + "AdminDepartureResponse.required",
                        hasItems("originalPrice", "discountPercent", "state", "editable", "dateEditable", "deletable")))
                .andExpect(jsonPath(SCHEMAS + "AdminDepartureResponse.properties.originalPrice.type[*]",
                        containsInAnyOrder("integer", "null")))
                .andExpect(jsonPath(SCHEMAS + "AdminDepartureResponse.properties.state.enum[*]",
                        containsInAnyOrder("UPCOMING", "SOLD_OUT", "CLOSED", "PAST")));
    }
}
