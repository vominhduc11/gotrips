package com.gotrips.gotrips_api.support;

import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.gotrips.gotrips_api.TestcontainersConfiguration;

/**
 * Nền cho test các API danh mục công khai. Mỗi test chạy trong một transaction rồi rollback, nên dữ liệu dựng bằng
 * {@link CatalogTestData} không lẫn sang test khác và các bảng danh mục (không có seed ở profile mặc định) luôn
 * bắt đầu rỗng. MockMvc chạy cùng luồng với test nên service tham gia chung transaction đó.
 * Dùng cùng cấu hình với {@code AuthControllerTests} nên cả bộ test chỉ dựng một application context.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@Transactional
public abstract class CatalogApiTest {

    @Autowired
    protected MockMvc mvc;

    @Autowired
    protected JdbcTemplate jdbc;

    protected CatalogTestData data;

    @BeforeEach
    void createTestData() {
        data = new CatalogTestData(jdbc);
    }
}
