package com.gotrips.gotrips_api.support;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItems;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import com.jayway.jsonpath.JsonPath;

/**
 * Hợp đồng OpenAPI của các API danh mục. Client của web do Orval sinh từ spec này nên tên hàm (operationId), kiểu
 * tham số {@code limit} và độ "bắt buộc/nullable" của field quyết định kiểu TypeScript được sinh ra: lệch ở đây là
 * web sinh sai kiểu mà không báo lỗi lúc build API.
 */
class CatalogOpenApiTests extends CatalogApiTest {

    @ParameterizedTest
    @ValueSource(strings = { "/tours/featured", "/hotels/featured", "/flight-routes/popular" })
    void limitParameterIsAnOptionalIntegerBetween1And50(String path) throws Exception {
        String parameter = "$.paths['" + path + "'].get.parameters[0]";

        mvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath(parameter + ".name").value("limit"))
                .andExpect(jsonPath(parameter + ".required").value(false))
                .andExpect(jsonPath(parameter + ".schema.type").value("integer"))
                .andExpect(jsonPath(parameter + ".schema.minimum").value(1))
                .andExpect(jsonPath(parameter + ".schema.maximum").value(50));
    }

    @Test
    void operationIdsMatchTheNamesTheWebClientUses() throws Exception {
        mvc.perform(get("/v3/api-docs"))
                .andExpect(jsonPath("$.paths['/destinations'].get.operationId").value("listDestinations"))
                .andExpect(jsonPath("$.paths['/airports'].get.operationId").value("listAirports"))
                .andExpect(jsonPath("$.paths['/tours'].get.operationId").value("searchTours"))
                .andExpect(jsonPath("$.paths['/tours/{slug}'].get.operationId").value("getTour"))
                .andExpect(jsonPath("$.paths['/tours/featured'].get.operationId").value("listFeaturedTours"))
                .andExpect(jsonPath("$.paths['/hotels'].get.operationId").value("searchHotels"))
                .andExpect(jsonPath("$.paths['/hotels/{slug}'].get.operationId").value("getHotel"))
                .andExpect(jsonPath("$.paths['/hotels/featured'].get.operationId").value("listFeaturedHotels"))
                .andExpect(jsonPath("$.paths['/flight-routes/popular'].get.operationId")
                        .value("listPopularFlightRoutes"))
                .andExpect(jsonPath("$.paths['/testimonials'].get.operationId").value("listTestimonials"))
                .andExpect(jsonPath("$.paths['/newsletter/subscriptions'].post.operationId")
                        .value("subscribeNewsletter"));
    }

    @Test
    void searchToursParametersAreAllOptionalWithTheTypesTheWebClientExpects() throws Exception {
        String parameters = "$.paths['/tours'].get.parameters";

        mvc.perform(get("/v3/api-docs"))
                .andExpect(jsonPath(parameters, hasSize(6)))
                .andExpect(jsonPath(parameters + "[?(@.required==true)]").isEmpty())
                .andExpect(jsonPath(parameters + "[?(@.name=='destination')].schema.type").value("string"))
                .andExpect(jsonPath(parameters + "[?(@.name=='q')].schema.type").value("string"))
                // Ngày phải là string (format date): nếu thành object/integer thì Orval sinh sai kiểu.
                .andExpect(jsonPath(parameters + "[?(@.name=='date')].schema.type").value("string"))
                .andExpect(jsonPath(parameters + "[?(@.name=='date')].schema.format").value("date"))
                .andExpect(jsonPath(parameters + "[?(@.name=='guests')].schema.type").value("integer"))
                .andExpect(jsonPath(parameters + "[?(@.name=='guests')].schema.minimum").value(1))
                .andExpect(jsonPath(parameters + "[?(@.name=='guests')].schema.maximum").value(50))
                .andExpect(jsonPath(parameters + "[?(@.name=='page')].schema.type").value("integer"))
                .andExpect(jsonPath(parameters + "[?(@.name=='page')].schema.minimum").value(1))
                .andExpect(jsonPath(parameters + "[?(@.name=='sort')].schema.default").value("FEATURED"))
                .andExpect(jsonPath(parameters + "[?(@.name=='sort')].schema.enum[*]")
                        .value(hasItems("FEATURED", "NEAREST_DEPARTURE", "PRICE_ASC", "PRICE_DESC", "RATING")));
    }

    @Test
    void searchHotelsParametersHaveTheRequirednessAndTypesTheWebClientExpects() throws Exception {
        String parameters = "$.paths['/hotels'].get.parameters";

        mvc.perform(get("/v3/api-docs"))
                .andExpect(jsonPath(parameters, hasSize(5)))
                // Điểm đến và hai ngày bắt buộc (Orval sinh `T`); số khách/số phòng có mặc định nên tuỳ chọn (`T?`).
                .andExpect(jsonPath(parameters + "[?(@.required==true)].name")
                        .value(hasItems("destination", "checkIn", "checkOut")))
                .andExpect(jsonPath(parameters + "[?(@.required==true)]", hasSize(3)))
                .andExpect(jsonPath(parameters + "[?(@.name=='destination')].schema.type").value("string"))
                // Ngày phải là string (format date): nếu thành object/integer thì Orval sinh sai kiểu.
                .andExpect(jsonPath(parameters + "[?(@.name=='checkIn')].schema.type").value("string"))
                .andExpect(jsonPath(parameters + "[?(@.name=='checkIn')].schema.format").value("date"))
                .andExpect(jsonPath(parameters + "[?(@.name=='checkOut')].schema.type").value("string"))
                .andExpect(jsonPath(parameters + "[?(@.name=='checkOut')].schema.format").value("date"))
                .andExpect(jsonPath(parameters + "[?(@.name=='guests')].schema.type").value("integer"))
                .andExpect(jsonPath(parameters + "[?(@.name=='guests')].schema.minimum").value(1))
                .andExpect(jsonPath(parameters + "[?(@.name=='guests')].schema.maximum").value(30))
                .andExpect(jsonPath(parameters + "[?(@.name=='guests')].schema.default").value(2))
                .andExpect(jsonPath(parameters + "[?(@.name=='rooms')].schema.type").value("integer"))
                .andExpect(jsonPath(parameters + "[?(@.name=='rooms')].schema.minimum").value(1))
                .andExpect(jsonPath(parameters + "[?(@.name=='rooms')].schema.maximum").value(10))
                .andExpect(jsonPath(parameters + "[?(@.name=='rooms')].schema.default").value(1));
    }

    @Test
    void hotelSearchResponseHasNoNullableObjectOnlyANullableName() throws Exception {
        mvc.perform(get("/v3/api-docs"))
                .andExpect(jsonPath("$.components.schemas.HotelSearchResponse.required", hasSize(2)))
                .andExpect(jsonPath("$.components.schemas.HotelSearchResponse.properties.destinationName.type[0]")
                        .value("string"))
                .andExpect(jsonPath("$.components.schemas.HotelSearchResponse.properties.destinationName.type[1]")
                        .value("null"))
                .andExpect(jsonPath("$.components.schemas.HotelSearchResponse.properties.items.items['$ref']")
                        .value("#/components/schemas/HotelSearchResultResponse"));
    }

    @Test
    void hotelDetailAndSearchResultAreFlatCardsPlusTheirOwnRequiredFields() throws Exception {
        String card = "$.components.schemas.HotelCardResponse";
        String detail = "$.components.schemas.HotelDetailResponse";
        String result = "$.components.schemas.HotelSearchResultResponse";

        // Thẻ có 12 field. Chi tiết = thẻ + 6 (description, amenities, images, checkInTime, checkOutTime, roomTypes);
        // kết quả tìm = thẻ + 4 (room, nights, rooms, totalPrice). Không field nào nullable.
        mvc.perform(get("/v3/api-docs"))
                .andExpect(jsonPath(card + ".required", hasSize(12)))
                .andExpect(jsonPath(detail + ".required", hasSize(18)))
                .andExpect(jsonPath(detail + ".required", hasItems("description", "amenities", "images", "checkInTime",
                        "checkOutTime", "roomTypes", "minPricePerNight")))
                // Giờ là chuỗi "HH:mm" (không phải kiểu time của OpenAPI) để web in nguyên.
                .andExpect(jsonPath(detail + ".properties.checkInTime.type").value("string"))
                .andExpect(jsonPath(detail + ".properties.checkOutTime.type").value("string"))
                .andExpect(jsonPath(detail + ".properties.amenities.items['$ref']")
                        .value("#/components/schemas/AmenityResponse"))
                .andExpect(jsonPath(detail + ".properties.images.items['$ref']")
                        .value("#/components/schemas/ImageResponse"))
                .andExpect(jsonPath(detail + ".properties.roomTypes.items['$ref']")
                        .value("#/components/schemas/HotelRoomTypeDetailResponse"))
                .andExpect(jsonPath(result + ".required", hasSize(16)))
                .andExpect(jsonPath(result + ".required", hasItems("room", "nights", "rooms", "totalPrice")))
                .andExpect(jsonPath(result + ".properties.room['$ref']")
                        .value("#/components/schemas/HotelRoomTypeResponse"))
                .andExpect(jsonPath("$.components.schemas.HotelRoomTypeResponse.required", hasSize(6)));
    }

    @Test
    void hotelImagesAmenitiesAndDetailedRoomTypesAreFullyRequired() throws Exception {
        String roomDetail = "$.components.schemas.HotelRoomTypeDetailResponse";

        // Thiếu REQUIRED ở đâu thì Orval sinh `T?` và web phải xử lý một trường hợp không bao giờ xảy ra.
        mvc.perform(get("/v3/api-docs"))
                .andExpect(jsonPath("$.components.schemas.AmenityResponse.required", hasItems("code", "name")))
                .andExpect(jsonPath("$.components.schemas.AmenityResponse.required", hasSize(2)))
                .andExpect(jsonPath("$.components.schemas.ImageResponse.required", hasItems("url", "alt")))
                .andExpect(jsonPath("$.components.schemas.ImageResponse.required", hasSize(2)))
                .andExpect(jsonPath(roomDetail + ".required", hasSize(8)))
                .andExpect(jsonPath(roomDetail + ".required", hasItems("images", "amenities")))
                .andExpect(jsonPath(roomDetail + ".properties.images.items['$ref']")
                        .value("#/components/schemas/ImageResponse"))
                .andExpect(jsonPath(roomDetail + ".properties.amenities.items['$ref']")
                        .value("#/components/schemas/AmenityResponse"));
    }

    /**
     * Loại phòng chi tiết phải chứa nguyên vẹn bản gốc: web dùng bản chi tiết ở chỗ nhận kiểu gốc. MapStruct chỉ canh
     * được TÊN field lúc biên dịch; test này canh cả kiểu và chú thích {@code @Schema}.
     */
    @Test
    void detailedRoomTypeKeepsEveryPropertyOfTheBaseRoomTypeWithTheSameSchema() throws Exception {
        String spec = mvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        Map<String, Object> base = JsonPath.read(spec, "$.components.schemas.HotelRoomTypeResponse.properties");
        Map<String, Object> detail = JsonPath.read(spec,
                "$.components.schemas.HotelRoomTypeDetailResponse.properties");

        assertThat(base).hasSize(6);
        assertThat(detail).containsAllEntriesOf(base);
    }

    @Test
    void tourSearchResponseHasNoNullableObjectOnlyANullableName() throws Exception {
        // Thuộc tính object nullable bị springdoc sinh thành {"type":"null","$ref":...} (vô nghĩa, Orval sinh sai kiểu)
        // nên đã đổi sang tên (string | null). Test này giữ cho điều đó không bị đổi ngược lại.
        mvc.perform(get("/v3/api-docs"))
                .andExpect(jsonPath("$.components.schemas.TourSearchResponse.required", hasSize(5)))
                .andExpect(jsonPath("$.components.schemas.TourSearchResponse.properties.destinationName.type[0]")
                        .value("string"))
                .andExpect(jsonPath("$.components.schemas.TourSearchResponse.properties.destinationName.type[1]")
                        .value("null"))
                .andExpect(jsonPath("$.components.schemas.TourSearchResponse.properties.items.items['$ref']")
                        .value("#/components/schemas/TourCardResponse"));
    }

    @Test
    void tourDetailFieldsAreAllRequiredAndKeepTheSameNullabilityAsTheCard() throws Exception {
        String detail = "$.components.schemas.TourDetailResponse";
        String card = "$.components.schemas.TourCardResponse";

        // Chi tiết = thẻ (18) + shortDescription, departures, testimonials. Phải giữ giống thẻ vì web gán chi tiết vào kiểu thẻ.
        mvc.perform(get("/v3/api-docs"))
                .andExpect(jsonPath(detail + ".required", hasSize(21)))
                .andExpect(jsonPath(detail + ".required", hasItems("shortDescription", "departures", "testimonials",
                        "nextDepartureDate", "seatsLeft", "priceFrom", "originalPriceFrom", "discountPercent",
                        "isAlmostFull")))
                .andExpect(jsonPath(detail + ".properties.priceFrom.type[1]").value("null"))
                .andExpect(jsonPath(detail + ".properties.seatsLeft.type[1]").value("null"))
                .andExpect(jsonPath(detail + ".properties.nextDepartureDate.type[1]").value("null"))
                .andExpect(jsonPath(detail + ".properties.isAlmostFull.type").value("boolean"))
                .andExpect(jsonPath(detail + ".properties.departures.items['$ref']")
                        .value("#/components/schemas/TourDepartureResponse"))
                .andExpect(jsonPath(card + ".properties.priceFrom.type[1]").value("null"));
    }

    @Test
    void tourDepartureFieldsAreAllRequiredAndTheDiscountOnesAreNullable() throws Exception {
        String departure = "$.components.schemas.TourDepartureResponse";

        mvc.perform(get("/v3/api-docs"))
                .andExpect(jsonPath(departure + ".required", hasSize(8)))
                .andExpect(jsonPath(departure + ".properties.originalPrice.type[1]").value("null"))
                .andExpect(jsonPath(departure + ".properties.discountPercent.type[1]").value("null"))
                .andExpect(jsonPath(departure + ".properties.isSoldOut.type").value("boolean"))
                .andExpect(jsonPath(departure + ".properties.isAlmostFull.type").value("boolean"));
    }

    @Test
    void tourCardFieldsAreAllRequiredAndTheDerivedOnesAreNullable() throws Exception {
        // Bắt buộc có mặt (Orval sinh `T`, không phải `T?`) nhưng được phép null (`T | null`).
        mvc.perform(get("/v3/api-docs"))
                .andExpect(jsonPath("$.components.schemas.TourCardResponse.required", hasSize(18)))
                .andExpect(jsonPath("$.components.schemas.TourCardResponse.required",
                        hasItems("nextDepartureDate", "seatsLeft", "priceFrom", "originalPriceFrom", "discountPercent",
                                "isAlmostFull")))
                .andExpect(jsonPath("$.components.schemas.TourCardResponse.properties.priceFrom.type[1]")
                        .value("null"))
                .andExpect(jsonPath("$.components.schemas.TourCardResponse.properties.isAlmostFull.type")
                        .value("boolean"));
    }
}
