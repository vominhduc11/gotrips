package com.gotrips.gotrips_api.support;

import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.ResultActions;

import jakarta.persistence.EntityManager;

/**
 * Nền cho test API đặt chỗ. Kế thừa {@link CatalogApiTest} (mỗi test một transaction rồi rollback). Vì cả test dùng
 * chung một persistence context, sau mỗi request phải flush + clear để giống ranh giới request thật: request sau đọc
 * lại từ DB (nếu không, số chỗ cập nhật bằng UPDATE trực tiếp hay giá sửa bằng SQL sẽ không được thấy).
 */
public abstract class BookingApiTest extends CatalogApiTest {

    @Autowired
    protected EntityManager entityManager;

    protected BookingTestClient client;

    @BeforeEach
    void createClient() {
        client = new BookingTestClient(mvc, jdbc, this::newRequestBoundary);
    }

    protected ResultActions postAs(String path, BookingTestClient.Account account, String json) throws Exception {
        ResultActions result = client.postJson(path, account == null ? null : account.token(), json);
        newRequestBoundary();
        return result;
    }

    protected ResultActions getAs(String path, BookingTestClient.Account account) throws Exception {
        ResultActions result = client.getAs(path, account == null ? null : account.token());
        newRequestBoundary();
        return result;
    }

    /** Đẩy thay đổi xuống DB và quên các entity đã nạp. Gọi cả sau khi sửa danh mục bằng SQL. */
    protected void newRequestBoundary() {
        entityManager.flush();
        entityManager.clear();
    }

    protected int count(String sql, Object... args) {
        Integer value = jdbc.queryForObject(sql, Integer.class, args);
        return value == null ? 0 : value;
    }
}
