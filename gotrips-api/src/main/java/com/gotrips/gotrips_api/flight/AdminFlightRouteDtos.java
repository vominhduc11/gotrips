package com.gotrips.gotrips_api.flight;

import static com.gotrips.gotrips_api.flight.AdminFlightReferences.AIRPORT_CODE;
import static com.gotrips.gotrips_api.flight.AdminFlightReferences.AIRPORT_CODE_MESSAGE;
import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public final class AdminFlightRouteDtos {

    private AdminFlightRouteDtos() {
    }

    public record AdminFlightRouteRequest(
            @NotBlank(message = "Vui lòng chọn điểm đi.")
            @Pattern(regexp = AIRPORT_CODE, message = AIRPORT_CODE_MESSAGE)
            String fromCode,
            @NotBlank(message = "Vui lòng chọn điểm đến.")
            @Pattern(regexp = AIRPORT_CODE, message = AIRPORT_CODE_MESSAGE)
            String toCode,
            @NotNull(message = "Vui lòng nhập thời lượng bay.")
            @Positive(message = "Thời lượng phải lớn hơn 0 phút.")
            Integer durationMinutes,
            @NotNull(message = "Vui lòng nhập giá tham khảo.")
            @Positive(message = "Giá tham khảo phải lớn hơn 0.")
            @Max(value = 9_007_199_254_740_991L, message = "Giá tham khảo vượt giới hạn số nguyên của website.")
            Long referencePrice,
            @NotBlank(message = "Vui lòng nhập địa chỉ ảnh.")
            @Size(max = 500, message = "Địa chỉ ảnh không được quá 500 ký tự.")
            String imageUrl,
            @NotBlank(message = "Vui lòng nhập mô tả ảnh.")
            @Size(max = 255, message = "Mô tả ảnh không được quá 255 ký tự.")
            String imageAlt) {

        public AdminFlightRouteRequest {
            imageUrl = imageUrl == null ? null : imageUrl.strip();
            imageAlt = imageAlt == null ? null : imageAlt.strip();
        }
    }

    public record AdminFlightRouteOrderRequest(
            @NotNull(message = "Vui lòng gửi thứ tự hiện tại.")
            List<@NotNull @Positive Long> expectedIds,
            @NotNull(message = "Vui lòng gửi thứ tự mới.")
            List<@NotNull @Positive Long> orderedIds) {
    }

    public record AdminFlightRouteResponse(
            @Schema(requiredMode = REQUIRED) long id,
            @Schema(requiredMode = REQUIRED) AirportResponse from,
            @Schema(requiredMode = REQUIRED) AirportResponse to,
            @Schema(requiredMode = REQUIRED) int durationMinutes,
            @Schema(requiredMode = REQUIRED) long referencePrice,
            @Schema(requiredMode = REQUIRED) String imageUrl,
            @Schema(requiredMode = REQUIRED) String imageAlt,
            @Schema(requiredMode = REQUIRED) int sortOrder) {
    }
}
