package com.gotrips.gotrips_api.user;

import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.hasItems;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;

import com.gotrips.gotrips_api.support.CatalogApiTest;

class AdminAccountOpenApiTests extends CatalogApiTest {

    @Test
    void publishesOperationsAndSchemasForTheGeneratedAdminClient() throws Exception {
        var doc = mvc.perform(get("/v3/api-docs")).andExpect(status().isOk());
        doc.andExpect(jsonPath("$.paths['/admin/customers'].get.operationId").value("listAdminCustomers"))
                .andExpect(jsonPath("$.paths['/admin/customers/{id}'].get.operationId").value("getAdminCustomer"))
                .andExpect(jsonPath("$.paths['/admin/staff'].get.operationId").value("listAdminStaff"))
                .andExpect(jsonPath("$.paths['/admin/staff'].post.operationId").value("createAdminStaff"))
                .andExpect(jsonPath("$.paths['/admin/staff'].post.responses['201']").exists())
                .andExpect(jsonPath("$.paths['/admin/staff/{id}/role'].put.operationId").value("updateAdminStaffRole"))
                .andExpect(jsonPath("$.paths['/admin/staff/{id}/role'].delete.operationId").value("revokeAdminStaffRole"))
                .andExpect(jsonPath("$.paths['/admin/staff/{id}/role'].delete.responses['204']").exists())
                .andExpect(jsonPath("$.paths['/admin/auth/password'].put.operationId").value("changeAdminPassword"))
                .andExpect(jsonPath("$.paths['/admin/auth/password'].put.responses['204']").exists())
                .andExpect(jsonPath("$.paths['/admin/auth/password'].put.security[*].adminCookieAuth").exists())
                .andExpect(jsonPath("$.paths['/admin/customers'].get.parameters[?(@.name == 'page')].schema.type")
                        .value(hasItems("integer")))
                .andExpect(jsonPath("$.paths['/admin/customers'].get.parameters[?(@.name == 'sort')].schema.enum[0]")
                        .value(hasItems("CREATED_DESC")))
                .andExpect(jsonPath("$.components.schemas.AdminCustomerResponse.required").value(containsInAnyOrder(
                        "id", "fullName", "email", "createdAt", "bookingCount", "totalPaid", "lastBookingAt")))
                .andExpect(jsonPath("$.components.schemas.AdminCustomerResponse.properties.lastBookingAt.type")
                        .value(containsInAnyOrder("string", "null")))
                .andExpect(jsonPath("$.components.schemas.AdminCustomerPageResponse.required")
                        .value(containsInAnyOrder("items", "page", "size", "totalItems", "totalPages")))
                .andExpect(jsonPath("$.components.schemas.AdminStaffResponse.required")
                        .value(containsInAnyOrder("id", "fullName", "email", "role", "createdAt")))
                .andExpect(jsonPath("$.components.schemas.AdminStaffResponse.properties.password").doesNotExist())
                .andExpect(jsonPath("$.components.schemas.AdminCreateStaffRequest.required")
                        .value(containsInAnyOrder("fullName", "email", "password", "role")))
                .andExpect(jsonPath("$.components.schemas.AdminChangePasswordRequest.required")
                        .value(containsInAnyOrder("currentPassword", "newPassword")));
    }
}
