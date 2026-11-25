package com.gotrips.gotrips_api.newsletter;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

import com.gotrips.gotrips_api.support.CatalogApiTest;

/** POST /newsletter/subscriptions. */
class NewsletterControllerTests extends CatalogApiTest {

    private ResultActions subscribe(String email) throws Exception {
        String json = email == null ? "{}" : "{\"email\": \"%s\"}".formatted(email);
        return mvc.perform(post("/newsletter/subscriptions").contentType(MediaType.APPLICATION_JSON).content(json));
    }

    @Test
    void subscribingWithoutTokenSucceedsWith204AndStoresOneRow() throws Exception {
        subscribe("ban@example.com").andExpect(status().isNoContent());

        assertThat(data.countNewsletterSubscriptions()).isEqualTo(1);
    }

    @Test
    void subscribingTheSameEmailAgainStillReturns204AndKeepsOneRow() throws Exception {
        subscribe("ban@example.com").andExpect(status().isNoContent());
        subscribe("ban@example.com").andExpect(status().isNoContent());

        // Phản hồi giống hệt lần đầu: không lộ email nào đã có trong danh sách.
        assertThat(data.countNewsletterSubscriptions()).isEqualTo(1);
    }

    @Test
    void emailIsNormalizedToLowercaseSoCaseVariantsAreDuplicates() throws Exception {
        subscribe("  Ban@Example.COM ").andExpect(status().isNoContent());
        subscribe("ban@example.com").andExpect(status().isNoContent());

        assertThat(data.countNewsletterSubscriptions()).isEqualTo(1);
        String stored = jdbc.queryForObject("SELECT email FROM newsletter_subscriptions", String.class);
        assertThat(stored).isEqualTo("ban@example.com");
    }

    @Test
    void malformedEmailsAreRejectedWith400AndFieldErrors() throws Exception {
        for (String invalid : new String[] { "khong-co-a-cong", "a@b", "a@b.c", "a b@example.com", "@example.com" }) {
            subscribe(invalid)
                    .andExpect(status().isBadRequest())
                    .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                    .andExpect(jsonPath("$.errors[?(@.field=='email')]").exists());
        }

        assertThat(data.countNewsletterSubscriptions()).isZero();
    }

    @Test
    void blankOrMissingEmailIsRejectedWith400() throws Exception {
        subscribe("   ").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[?(@.field=='email')]").exists());
        subscribe(null).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[?(@.field=='email')]").exists());
    }

    @Test
    void tooLongEmailIsRejectedWith400() throws Exception {
        String tooLong = "a".repeat(250) + "@example.com";

        subscribe(tooLong).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[?(@.field=='email')]").exists());
        assertThat(data.countNewsletterSubscriptions()).isZero();
    }
}
