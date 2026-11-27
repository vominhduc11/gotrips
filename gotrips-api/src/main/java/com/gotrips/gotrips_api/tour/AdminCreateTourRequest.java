package com.gotrips.gotrips_api.tour;

import com.gotrips.gotrips_api.common.catalog.CatalogSlugs;
import com.gotrips.gotrips_api.common.catalog.CatalogVisibility;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Tạo tour. Như {@link AdminUpdateTourRequest}, thêm trạng thái ban đầu. */
@Schema(description = "Tour mới")
public record AdminCreateTourRequest(
        @Schema(example = "da-lat-3n2d")
        @NotBlank(message = AdminTourRules.SLUG_REQUIRED)
        @Size(max = AdminTourRules.SLUG_MAX_LENGTH, message = AdminTourRules.SLUG_TOO_LONG)
        @Pattern(regexp = CatalogSlugs.PATTERN, message = CatalogSlugs.PATTERN_MESSAGE)
        String slug,

        @NotBlank(message = AdminTourRules.TITLE_REQUIRED)
        @Size(max = AdminTourRules.TITLE_MAX_LENGTH, message = AdminTourRules.TITLE_TOO_LONG)
        String title,

        @NotNull(message = AdminTourRules.DESTINATION_REQUIRED)
        Long destinationId,

        @NotNull(message = AdminTourRules.DAYS_REQUIRED)
        @Min(value = 1, message = AdminTourRules.DAYS_RANGE)
        @Max(value = AdminTourRules.MAX_DURATION, message = AdminTourRules.DAYS_RANGE)
        Integer durationDays,

        @Schema(description = "Không lớn hơn số ngày")
        @NotNull(message = AdminTourRules.NIGHTS_REQUIRED)
        @Min(value = 0, message = AdminTourRules.NIGHTS_RANGE)
        @Max(value = AdminTourRules.MAX_DURATION, message = AdminTourRules.NIGHTS_RANGE)
        Integer durationNights,

        @NotBlank(message = AdminTourRules.CITY_REQUIRED)
        @Size(max = AdminTourRules.DEPARTURE_CITY_MAX_LENGTH, message = AdminTourRules.CITY_TOO_LONG)
        String departureCity,

        @NotBlank(message = AdminTourRules.DESCRIPTION_REQUIRED)
        @Size(max = AdminTourRules.SHORT_DESCRIPTION_MAX_LENGTH, message = AdminTourRules.DESCRIPTION_TOO_LONG)
        String shortDescription,

        @NotBlank(message = AdminTourRules.IMAGE_URL_REQUIRED)
        @Size(max = AdminTourRules.IMAGE_URL_MAX_LENGTH, message = AdminTourRules.IMAGE_URL_TOO_LONG)
        String coverImageUrl,

        @NotBlank(message = AdminTourRules.IMAGE_ALT_REQUIRED)
        @Size(max = AdminTourRules.IMAGE_ALT_MAX_LENGTH, message = AdminTourRules.IMAGE_ALT_TOO_LONG)
        String coverImageAlt,

        @NotNull(message = AdminTourRules.FEATURED_REQUIRED)
        Boolean featured,

        @Schema(description = "Bỏ trống = ACTIVE (hiện ngay trên website)")
        CatalogVisibility status) implements AdminTourFields {

    public AdminCreateTourRequest {
        slug = AdminTourRules.strip(slug);
        title = AdminTourRules.strip(title);
        departureCity = AdminTourRules.strip(departureCity);
        shortDescription = AdminTourRules.strip(shortDescription);
        coverImageUrl = AdminTourRules.strip(coverImageUrl);
        coverImageAlt = AdminTourRules.strip(coverImageAlt);
    }
}
