package com.gotrips.gotrips_api.destination;

import static com.gotrips.gotrips_api.support.BookingTestClient.body;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasItems;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.http.HttpMethod;

import com.gotrips.gotrips_api.catalog.CatalogImageUrls;
import com.gotrips.gotrips_api.support.AdminCatalogApiTest;
import com.jayway.jsonpath.JsonPath;

class AdminDestinationControllerTests extends AdminCatalogApiTest {

    private static final String PATH = "/admin/destinations";

    private static String request(String slug, String name) {
        return """
                {"slug":"%s","name":"%s","region":"Tây Nguyên","imageUrl":"%s","imageAlt":"Đồi chè"}"""
                .formatted(slug, name, IMAGE);
    }

    @Test
    void listCountsEveryReferenceIncludingHiddenAndDeletedOnes() throws Exception {
        long daLat = data.destination("da-lat", "Đà Lạt");
        data.destination("sapa", "Sapa");
        data.tour("a", daLat, false, "ACTIVE");
        data.tour("b", daLat, false, "HIDDEN");
        data.tour("c", daLat, false, "DELETED");
        data.hotel("d", daLat, "ACTIVE", 4, 1);
        data.hotel("e", daLat, "DELETED", 4, 1);

        adminGet(PATH)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].slug", contains("da-lat", "sapa")))
                .andExpect(jsonPath("$[0].tourCount").value(3))
                .andExpect(jsonPath("$[0].hotelCount").value(2))
                .andExpect(jsonPath("$[1].tourCount").value(0))
                .andExpect(jsonPath("$[1].hotelCount").value(0));
        // Trang công khai vẫn chỉ đếm tour đang hiện.
        mvc.perform(get("/destinations")).andExpect(jsonPath("$[0].tourCount").value(1));
    }

    @Test
    void createTrimsInputShowsOnTheWebsiteAndRefreshesTheCache() throws Exception {
        adminPost(PATH, request("  da-lat ", "  Đà Lạt "))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.slug").value("da-lat"))
                .andExpect(jsonPath("$.name").value("Đà Lạt"))
                .andExpect(jsonPath("$.imageUrl").value(IMAGE))
                .andExpect(jsonPath("$.tourCount").value(0));

        mvc.perform(get("/destinations")).andExpect(jsonPath("$[*].slug", hasItem("da-lat")));
        assertThat(catalogEvents()).isEqualTo(1);
    }

    @Test
    void updateKeepsItsOwnSlugAndReportsTheReferenceCounts() throws Exception {
        long id = data.destination("da-lat", "Đà Lạt");
        data.tour("a", id, false, "ACTIVE");

        adminPut(PATH + "/" + id, request("da-lat", "Đà Lạt mới"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Đà Lạt mới"))
                .andExpect(jsonPath("$.tourCount").value(1));

        mvc.perform(get("/destinations")).andExpect(jsonPath("$[0].name").value("Đà Lạt mới"));
        assertThat(catalogEvents()).isEqualTo(1);
    }

    @Test
    void duplicateSlugIsAConflictOnTheSlugFieldAndPublishesNothing() throws Exception {
        data.destination("da-lat", "Đà Lạt");
        long sapa = data.destination("sapa", "Sapa");

        adminPost(PATH, request("da-lat", "Khác"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errors[0].field").value("slug"));
        adminPut(PATH + "/" + sapa, request("da-lat", "Sapa"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errors[0].field").value("slug"));

        assertThat(catalogEvents()).isZero();
    }

    @Test
    void invalidFieldsAreReportedTogether() throws Exception {
        adminPost(PATH, """
                {"slug":"Đà Lạt","name":" ","region":"","imageUrl":"","imageAlt":null}""")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[*].field",
                        hasItems("slug", "name", "region", "imageUrl", "imageAlt")));
    }

    /** Website bỏ qua {@code ?destination=} dài hơn 60 ký tự rồi hiện mọi tour. */
    @Test
    void slugLongerThanTheWebsiteFilterAcceptsIsRejected() throws Exception {
        adminPost(PATH, request("a".repeat(60), "Vừa đủ")).andExpect(status().isCreated());
        adminPost(PATH, request("a".repeat(61), "Quá dài"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("slug"));
    }

    @Test
    void imageOutsideTheAllowListIsRejectedOnBothWrites() throws Exception {
        long id = data.destination("sapa", "Sapa");
        String bad = request("da-lat", "Đà Lạt").replace(IMAGE, "https://xau.com/anh.jpg");

        adminPost(PATH, bad)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("imageUrl"))
                .andExpect(jsonPath("$.errors[0].message").value(CatalogImageUrls.MESSAGE));
        adminPut(PATH + "/" + id, bad)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("imageUrl"));
        assertThat(catalogEvents()).isZero();
    }

    @ParameterizedTest
    @CsvSource({ "tour, ACTIVE", "tour, HIDDEN", "tour, DELETED", "hotel, ACTIVE", "hotel, DELETED" })
    void anyReferenceBlocksDeletionEvenASoftDeletedOne(String kind, String referenceStatus) throws Exception {
        long id = data.destination("da-lat", "Đà Lạt");
        if (kind.equals("tour")) {
            data.tour("a", id, false, referenceStatus);
        } else {
            data.hotel("a", id, referenceStatus, 4, 1);
        }

        adminDelete(PATH + "/" + id).andExpect(status().isConflict());

        assertThat(count("SELECT count(*) FROM destinations WHERE id = ?", id)).isEqualTo(1);
        assertThat(catalogEvents()).isZero();
    }

    @Test
    void unusedDestinationIsDeletedOnce() throws Exception {
        String created = body(adminPost(PATH, request("da-lat", "Đà Lạt")));
        int id = JsonPath.read(created, "$.id");

        adminDelete(PATH + "/" + id).andExpect(status().isNoContent());
        adminDelete(PATH + "/" + id).andExpect(status().isNotFound());
        adminPut(PATH + "/" + id, request("da-lat", "Đà Lạt")).andExpect(status().isNotFound());

        adminGet(PATH).andExpect(jsonPath("$", hasSize(0)));
        assertThat(catalogEvents()).isEqualTo(2);
    }

    @ParameterizedTest
    @CsvSource({ "GET, /admin/destinations", "POST, /admin/destinations", "PUT, /admin/destinations/1",
            "DELETE, /admin/destinations/1" })
    void onlyStaffMayUseTheseEndpoints(String method, String path) throws Exception {
        var customer = client.customer();
        newRequestBoundary();

        client.send(HttpMethod.valueOf(method), path, null, request("x", "X")).andExpect(status().isUnauthorized());
        client.send(HttpMethod.valueOf(method), path, customer.token(), request("x", "X"))
                .andExpect(status().isForbidden());
    }
}
