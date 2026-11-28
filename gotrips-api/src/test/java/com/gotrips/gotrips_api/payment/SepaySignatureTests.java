package com.gotrips.gotrips_api.payment;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.time.Instant;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/** Chữ ký HMAC-SHA256 của webhook SePay: "sha256=" + hex(HMAC(secret, "timestamp.body")). */
class SepaySignatureTests {

    private static final String SECRET = "bi-mat-thu-nghiem-sepay";
    private static final long TIMESTAMP = 1_764_009_000L;
    private static final byte[] BODY = "{\"id\":92704,\"content\":\"GT7K4Q2M chuyển tiền\"}"
            .getBytes(StandardCharsets.UTF_8);
    /** Tính độc lập bằng hmac của Python trên cùng khoá, timestamp và body UTF-8 (không suy ra từ code Java). */
    private static final String EXPECTED = "sha256=77c6338f131d0e902698285ce2bd87e59b306010fa81ca4aa316d722af3d98e3";
    private static final Instant SIGNED_AT = Instant.ofEpochSecond(TIMESTAMP);

    @Test
    void signsTheTimestampDotRawBodyWithLowerCaseHex() {
        assertThat("sha256=" + SepaySignature.sign(SECRET, TIMESTAMP, BODY)).isEqualTo(EXPECTED);
    }

    @Test
    void acceptsTheSignatureSePaySendsInEitherHexCase() {
        assertThat(SepaySignature.isValid(SECRET, String.valueOf(TIMESTAMP), EXPECTED, BODY, SIGNED_AT)).isTrue();
        assertThat(SepaySignature.isValid(SECRET, " " + TIMESTAMP + " ", EXPECTED.toUpperCase(), BODY, SIGNED_AT))
                .isTrue();
    }

    @Test
    void rejectsAnotherSecretOrAChangedBody() {
        assertThat(SepaySignature.isValid("khoa-khac", String.valueOf(TIMESTAMP), EXPECTED, BODY, SIGNED_AT)).isFalse();
        byte[] changed = "{\"id\":92704,\"content\":\"GT7K4Q2M chuyển tiền \"}".getBytes(StandardCharsets.UTF_8);
        assertThat(SepaySignature.isValid(SECRET, String.valueOf(TIMESTAMP), EXPECTED, changed, SIGNED_AT)).isFalse();
    }

    @Test
    void theTimestampIsPartOfTheSignature() {
        // Đổi timestamp (vẫn trong khoảng cho phép) mà giữ chữ ký cũ: không qua được.
        assertThat(SepaySignature.isValid(SECRET, String.valueOf(TIMESTAMP + 1), EXPECTED, BODY, SIGNED_AT)).isFalse();
    }

    @Test
    void acceptsAtMostFiveMinutesOfClockDifferenceInBothDirections() {
        for (long offset : new long[] { -300, 300 }) {
            assertThat(SepaySignature.isValid(SECRET, String.valueOf(TIMESTAMP), EXPECTED, BODY,
                    SIGNED_AT.plusSeconds(offset))).isTrue();
        }
        for (long offset : new long[] { -301, 301 }) {
            assertThat(SepaySignature.isValid(SECRET, String.valueOf(TIMESTAMP), EXPECTED, BODY,
                    SIGNED_AT.plusSeconds(offset))).isFalse();
        }
    }

    @ParameterizedTest
    @ValueSource(strings = { "", "abc", "1764009000.5", "1764009000000" })
    void rejectsATimestampThatIsNotUnixSeconds(String timestamp) {
        assertThat(SepaySignature.isValid(SECRET, timestamp, EXPECTED, BODY, SIGNED_AT)).isFalse();
    }

    @Test
    void rejectsMissingHeadersASignatureWithoutPrefixAndABlankSecret() {
        String hexOnly = EXPECTED.substring("sha256=".length());
        assertThat(SepaySignature.isValid(SECRET, null, EXPECTED, BODY, SIGNED_AT)).isFalse();
        assertThat(SepaySignature.isValid(SECRET, String.valueOf(TIMESTAMP), null, BODY, SIGNED_AT)).isFalse();
        assertThat(SepaySignature.isValid(SECRET, String.valueOf(TIMESTAMP), hexOnly, BODY, SIGNED_AT)).isFalse();
        assertThat(SepaySignature.isValid(" ", String.valueOf(TIMESTAMP), EXPECTED, BODY, SIGNED_AT)).isFalse();
    }
}
