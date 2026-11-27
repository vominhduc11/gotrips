package com.gotrips.gotrips_api.catalog;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import com.gotrips.gotrips_api.common.error.InvalidRequestException;

class CatalogImageUrlsTests {

    private final CatalogImageUrls urls = new CatalogImageUrls(List.of("https://images.unsplash.com/photo-"));

    @ParameterizedTest
    @ValueSource(strings = {
            "https://images.unsplash.com/photo-1441974231531-c6227db76b6e",
            "https://images.unsplash.com/photo-1441974231531?auto=format&fit=crop&w=1600&q=75",
            "https://IMAGES.UNSPLASH.COM/photo-1" })
    void acceptsUrlsTheWebsiteCanRender(String url) {
        assertThat(urls.isAllowed(url)).isTrue();
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "",
            "khong-phai-url",
            "http://images.unsplash.com/photo-1",
            "HTTPS://images.unsplash.com/photo-1",
            "https://images.unsplash.com.xau.com/photo-1",
            "https://xau.com/photo-1",
            "https://xau.com/https://images.unsplash.com/photo-1",
            "https://images.unsplash.com@xau.com/photo-1",
            "https://nguoi@images.unsplash.com/photo-1",
            "https://images.unsplash.com:8443/photo-1",
            "https://images.unsplash.com/photo-",
            "https://images.unsplash.com/photo-1/khac",
            "https://images.unsplash.com/photo-1/../premium",
            "https://images.unsplash.com/photo-1%2F..%2Fpremium",
            "https://images.unsplash.com/photo-%2e%2e",
            "https://images.unsplash.com/photo-1%5Ckhac",
            "https://images.unsplash.com/premium_photo-1",
            "https://images.unsplash.com/photo-1#neo",
            "https://images.unsplash.com/photo-1 2",
            "https://images.unsplash.com/photo-1\\khac",
            "//images.unsplash.com/photo-1",
            "data:image/png;base64,AAAA" })
    void rejectsEverythingElse(String url) {
        assertThat(urls.isAllowed(url)).isFalse();
    }

    @Test
    void reportsTheFieldThatHeldTheBadUrl() {
        assertThatThrownBy(() -> urls.require("coverImageUrl", "https://xau.com/anh.jpg"))
                .isInstanceOfSatisfying(InvalidRequestException.class, error -> {
                    assertThat(error.getField()).isEqualTo("coverImageUrl");
                    assertThat(error.getMessage()).isEqualTo(CatalogImageUrls.MESSAGE);
                });
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "https://cdn.example.com",
            "http://cdn.example.com/anh/",
            "https://cdn.example.com:444/anh/",
            "https://cdn.example.com/anh?x=1",
            "cdn.example.com/anh/",
            "" })
    void refusesToStartWithAPrefixThatWouldAllowTooMuch(String prefix) {
        assertThatThrownBy(() -> new CatalogImageUrls(List.of(prefix))).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void everyConfiguredPrefixIsHonoured() {
        var two = new CatalogImageUrls(List.of("https://images.unsplash.com/photo-", " https://cdn.example.com/anh/"));

        assertThat(two.isAllowed("https://cdn.example.com/anh/da-lat.jpg")).isTrue();
        assertThat(two.isAllowed("https://images.unsplash.com/anh/da-lat.jpg")).isFalse();
    }
}
