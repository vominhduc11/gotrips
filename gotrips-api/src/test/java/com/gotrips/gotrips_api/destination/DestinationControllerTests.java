package com.gotrips.gotrips_api.destination;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;

import com.gotrips.gotrips_api.support.CatalogApiTest;

class DestinationControllerTests extends CatalogApiTest {

    @Test
    void listIsPublicAndEmptyWithoutData() throws Exception {
        mvc.perform(get("/destinations"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void listsEveryDestinationByIdAndCountsOnlyActiveTours() throws Exception {
        long daLat = data.destination("da-lat", "Đà Lạt");
        long phuQuoc = data.destination("phu-quoc", "Phú Quốc");
        long sapa = data.destination("sapa", "Sapa");

        data.tour("da-lat-1", daLat, true, "ACTIVE");
        data.tour("da-lat-2", daLat, false, "ACTIVE"); // đếm cả tour không nổi bật và tour chưa có chuyến
        data.tour("da-lat-an", daLat, true, "HIDDEN"); // tour HIDDEN không được đếm
        data.tour("sapa-an", sapa, true, "HIDDEN"); // điểm đến chỉ có tour HIDDEN ⇒ 0, vẫn có trong danh sách

        mvc.perform(get("/destinations"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(3)))
                .andExpect(jsonPath("$[0].id").value(daLat))
                .andExpect(jsonPath("$[0].slug").value("da-lat"))
                .andExpect(jsonPath("$[0].name").value("Đà Lạt"))
                .andExpect(jsonPath("$[0].region").value("Vùng"))
                .andExpect(jsonPath("$[0].tourCount").value(2))
                .andExpect(jsonPath("$[1].id").value(phuQuoc))
                .andExpect(jsonPath("$[1].tourCount").value(0))
                .andExpect(jsonPath("$[2].id").value(sapa))
                .andExpect(jsonPath("$[2].tourCount").value(0));
    }
}
