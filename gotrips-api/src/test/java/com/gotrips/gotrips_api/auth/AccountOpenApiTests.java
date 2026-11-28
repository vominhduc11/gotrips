package com.gotrips.gotrips_api.auth;

import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;

import com.gotrips.gotrips_api.config.OpenApiConfig;
import com.gotrips.gotrips_api.support.CatalogApiTest;

class AccountOpenApiTests extends CatalogApiTest {

    @Test
    void publishesAccountOperationsAndPreservesTheAdminPasswordSchema() throws Exception {
        String bearerSecurity = ".security[*]." + OpenApiConfig.BEARER_SCHEME;
        String profile = "$.paths['/auth/me'].put";
        String password = "$.paths['/auth/me/password'].put";
        mvc.perform(get("/v3/api-docs")).andExpect(status().isOk())
                .andExpect(jsonPath(profile + ".operationId").value("updateMe"))
                .andExpect(jsonPath(profile + ".responses['200']").exists())
                .andExpect(jsonPath(profile + bearerSecurity).exists())
                .andExpect(jsonPath(password + ".operationId").value("changeMyPassword"))
                .andExpect(jsonPath(password + ".responses['204']").exists())
                .andExpect(jsonPath(password + bearerSecurity).exists())
                .andExpect(jsonPath("$.components.schemas.UpdateProfileRequest.required")
                        .value(containsInAnyOrder("fullName")))
                .andExpect(jsonPath("$.components.schemas.UpdateProfileRequest.properties.phone.type")
                        .value(containsInAnyOrder("string", "null")))
                .andExpect(jsonPath("$.components.schemas.UserResponse.required").value(hasItem("phone")))
                .andExpect(jsonPath("$.components.schemas.UserResponse.properties.phone.type")
                        .value(containsInAnyOrder("string", "null")))
                .andExpect(jsonPath("$.components.schemas.ChangePasswordRequest.required")
                        .value(containsInAnyOrder("currentPassword", "newPassword")))
                .andExpect(jsonPath("$.components.schemas.AdminChangePasswordRequest.required")
                        .value(containsInAnyOrder("currentPassword", "newPassword")));
    }
}
