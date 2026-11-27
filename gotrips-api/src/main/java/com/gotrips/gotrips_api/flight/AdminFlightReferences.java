package com.gotrips.gotrips_api.flight;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

/** Mã chỉ thuộc yêu cầu tạo. Các giới hạn khớp với form quản trị và schema V2–V3. */
public final class AdminFlightReferences {

    static final String AIRLINE_CODE = "^[A-Z0-9]{2}$";
    static final String AIRPORT_CODE = "^[A-Z]{3}$";
    static final String AIRLINE_CODE_MESSAGE = "Mã hãng gồm đúng 2 chữ in hoa hoặc chữ số.";
    static final String AIRPORT_CODE_MESSAGE = "Mã IATA gồm đúng 3 chữ in hoa.";

    private AdminFlightReferences() {
    }

    public record AdminCreateAirlineRequest(
            @NotBlank(message = "Vui lòng nhập mã hãng.")
            @Pattern(regexp = AIRLINE_CODE, message = AIRLINE_CODE_MESSAGE)
            String code,
            @NotBlank(message = "Vui lòng nhập tên hãng.")
            @Size(max = 100, message = "Tên hãng không được quá 100 ký tự.")
            String name) {
    }

    public record AdminUpdateAirlineRequest(
            @NotBlank(message = "Vui lòng nhập tên hãng.")
            @Size(max = 100, message = "Tên hãng không được quá 100 ký tự.")
            String name) {
    }

    public record AdminCreateAirportRequest(
            @NotBlank(message = "Vui lòng nhập mã IATA.")
            @Pattern(regexp = AIRPORT_CODE, message = AIRPORT_CODE_MESSAGE)
            String code,
            @NotBlank(message = "Vui lòng nhập tên sân bay.")
            @Size(max = 150, message = "Tên sân bay không được quá 150 ký tự.")
            String name,
            @NotBlank(message = "Vui lòng nhập thành phố.")
            @Size(max = 100, message = "Tên thành phố không được quá 100 ký tự.")
            String city,
            @NotNull(message = "Vui lòng nhập thứ tự gợi ý.")
            Integer sortOrder) {
    }

    public record AdminUpdateAirportRequest(
            @NotBlank(message = "Vui lòng nhập tên sân bay.")
            @Size(max = 150, message = "Tên sân bay không được quá 150 ký tự.")
            String name,
            @NotBlank(message = "Vui lòng nhập thành phố.")
            @Size(max = 100, message = "Tên thành phố không được quá 100 ký tự.")
            String city,
            @NotNull(message = "Vui lòng nhập thứ tự gợi ý.")
            Integer sortOrder) {
    }

    public record AdminAirportResponse(
            @Schema(requiredMode = REQUIRED) String code,
            @Schema(requiredMode = REQUIRED) String name,
            @Schema(requiredMode = REQUIRED) String city,
            @Schema(requiredMode = REQUIRED) int sortOrder) {
    }
}
