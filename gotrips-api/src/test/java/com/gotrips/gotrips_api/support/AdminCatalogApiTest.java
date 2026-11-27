package com.gotrips.gotrips_api.support;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpMethod;
import org.springframework.test.context.event.ApplicationEvents;
import org.springframework.test.context.event.RecordApplicationEvents;
import org.springframework.test.web.servlet.ResultActions;

import com.gotrips.gotrips_api.catalog.WebCatalogChanged;

/**
 * Nền cho test API quản trị danh mục: gọi bằng tài khoản STAFF thật, mỗi lệnh gọi là một "request" riêng (flush + clear
 * như {@link BookingApiTest}).
 *
 * <p>Test chạy trong transaction rồi rollback nên webhook sau commit không bao giờ chạy; ở đây kiểm sự kiện được PHÁT
 * (phần "chỉ gửi sau commit" đã có {@code WebRevalidationTests}).
 */
@RecordApplicationEvents
public abstract class AdminCatalogApiTest extends BookingApiTest {

    /** URL ảnh nằm trong danh sách cho phép mặc định. */
    public static final String IMAGE = "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&w=800";

    @Autowired
    protected ApplicationEvents events;

    protected BookingTestClient.Account staff;

    @BeforeEach
    void createStaff() throws Exception {
        staff = client.staff();
        newRequestBoundary();
    }

    protected ResultActions adminGet(String path) throws Exception {
        return getAs(path, staff);
    }

    protected ResultActions adminPost(String path, String json) throws Exception {
        return adminSend(HttpMethod.POST, path, json);
    }

    protected ResultActions adminPut(String path, String json) throws Exception {
        return adminSend(HttpMethod.PUT, path, json);
    }

    protected ResultActions adminPatch(String path, String json) throws Exception {
        return adminSend(HttpMethod.PATCH, path, json);
    }

    protected ResultActions adminDelete(String path) throws Exception {
        return adminSend(HttpMethod.DELETE, path, null);
    }

    private ResultActions adminSend(HttpMethod method, String path, String json) throws Exception {
        ResultActions result = client.send(method, path, staff.token(), json);
        // Request lỗi không được flush: giống request thật, thay đổi dở dang của nó bị bỏ.
        if (result.andReturn().getResponse().getStatus() < 400) {
            newRequestBoundary();
        } else {
            entityManager.clear();
        }
        return result;
    }

    /** Số lần phát sự kiện làm mới cache từ đầu test tới giờ; mỗi sự kiện phải mang đúng bộ tag danh mục. */
    protected int catalogEvents() {
        return eventsWithTags("tours", "departures", "destinations");
    }

    /** Như {@link #catalogEvents} cho thao tác trên khách sạn và loại phòng. */
    protected int hotelEvents() {
        return eventsWithTags("hotels", "destinations");
    }

    private int eventsWithTags(String... tags) {
        List<WebCatalogChanged> published = events.stream(WebCatalogChanged.class).toList();
        assertThat(published).allSatisfy(event -> assertThat(event.tags()).containsExactly(tags));
        return published.size();
    }
}
