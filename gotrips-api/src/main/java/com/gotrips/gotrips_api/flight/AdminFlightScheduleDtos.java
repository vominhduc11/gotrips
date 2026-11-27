package com.gotrips.gotrips_api.flight;

import static com.gotrips.gotrips_api.flight.AdminFlightReferences.AIRLINE_CODE;
import static com.gotrips.gotrips_api.flight.AdminFlightReferences.AIRLINE_CODE_MESSAGE;
import static com.gotrips.gotrips_api.flight.AdminFlightReferences.AIRPORT_CODE;
import static com.gotrips.gotrips_api.flight.AdminFlightReferences.AIRPORT_CODE_MESSAGE;
import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;

/** Giới hạn nghiệp vụ của các ô nhập phải khớp schema Zod bên admin. */
public final class AdminFlightScheduleDtos {

    static final String HH_MM = "^([01][0-9]|2[0-3]):[0-5][0-9]$";
    private static final long MAX_ECONOMY_FARE = 1_000_000_000_000L;

    private AdminFlightScheduleDtos() {
    }

    interface ScheduleFields {
        String departTime();
        Integer durationMinutes();
        Long economyFare();
        Integer economySeats();
        Integer premiumEconomySeats();
        Integer businessSeats();
        Integer firstSeats();
    }

    public record AdminCreateFlightScheduleRequest(
            @NotBlank(message = "Vui lòng chọn hãng bay.")
            @Pattern(regexp = AIRLINE_CODE, message = AIRLINE_CODE_MESSAGE)
            String airlineCode,
            @NotBlank(message = "Vui lòng nhập số hiệu.")
            @Pattern(regexp = "^[A-Z0-9]{2}[0-9]{1,8}$", message = "Số hiệu gồm mã hãng và 1 đến 8 chữ số.")
            String flightNumber,
            @NotBlank(message = "Vui lòng chọn điểm đi.")
            @Pattern(regexp = AIRPORT_CODE, message = AIRPORT_CODE_MESSAGE)
            String fromCode,
            @NotBlank(message = "Vui lòng chọn điểm đến.")
            @Pattern(regexp = AIRPORT_CODE, message = AIRPORT_CODE_MESSAGE)
            String toCode,
            @NotBlank(message = "Vui lòng nhập giờ cất cánh.")
            @Pattern(regexp = HH_MM, message = "Giờ cất cánh phải theo dạng HH:mm.")
            String departTime,
            @NotNull(message = "Vui lòng nhập thời lượng bay.")
            @Min(value = 1, message = "Thời lượng phải từ 1 đến 1.439 phút.")
            @Max(value = 1439, message = "Thời lượng phải từ 1 đến 1.439 phút.")
            Integer durationMinutes,
            @NotNull(message = "Vui lòng nhập giá phổ thông.")
            @Positive(message = "Giá phổ thông phải lớn hơn 0.")
            @Max(value = MAX_ECONOMY_FARE, message = "Giá phổ thông tối đa 1.000 tỷ đồng.")
            Long economyFare,
            @NotNull(message = "Vui lòng nhập số ghế phổ thông.")
            @PositiveOrZero(message = "Số ghế phải từ 0 trở lên.")
            Integer economySeats,
            @NotNull(message = "Vui lòng nhập số ghế phổ thông đặc biệt.")
            @PositiveOrZero(message = "Số ghế phải từ 0 trở lên.")
            Integer premiumEconomySeats,
            @NotNull(message = "Vui lòng nhập số ghế thương gia.")
            @PositiveOrZero(message = "Số ghế phải từ 0 trở lên.")
            Integer businessSeats,
            @NotNull(message = "Vui lòng nhập số ghế hạng nhất.")
            @PositiveOrZero(message = "Số ghế phải từ 0 trở lên.")
            Integer firstSeats) implements ScheduleFields {
    }

    public record AdminUpdateFlightScheduleRequest(
            @NotBlank(message = "Vui lòng nhập giờ cất cánh.")
            @Pattern(regexp = HH_MM, message = "Giờ cất cánh phải theo dạng HH:mm.")
            String departTime,
            @NotNull(message = "Vui lòng nhập thời lượng bay.")
            @Min(value = 1, message = "Thời lượng phải từ 1 đến 1.439 phút.")
            @Max(value = 1439, message = "Thời lượng phải từ 1 đến 1.439 phút.")
            Integer durationMinutes,
            @NotNull(message = "Vui lòng nhập giá phổ thông.")
            @Positive(message = "Giá phổ thông phải lớn hơn 0.")
            @Max(value = MAX_ECONOMY_FARE, message = "Giá phổ thông tối đa 1.000 tỷ đồng.")
            Long economyFare,
            @NotNull(message = "Vui lòng nhập số ghế phổ thông.")
            @PositiveOrZero(message = "Số ghế phải từ 0 trở lên.")
            Integer economySeats,
            @NotNull(message = "Vui lòng nhập số ghế phổ thông đặc biệt.")
            @PositiveOrZero(message = "Số ghế phải từ 0 trở lên.")
            Integer premiumEconomySeats,
            @NotNull(message = "Vui lòng nhập số ghế thương gia.")
            @PositiveOrZero(message = "Số ghế phải từ 0 trở lên.")
            Integer businessSeats,
            @NotNull(message = "Vui lòng nhập số ghế hạng nhất.")
            @PositiveOrZero(message = "Số ghế phải từ 0 trở lên.")
            Integer firstSeats) implements ScheduleFields {
    }

    public record AdminFlightScheduleResponse(
            @Schema(requiredMode = REQUIRED) long id,
            @Schema(requiredMode = REQUIRED) String flightNumber,
            @Schema(requiredMode = REQUIRED) AirlineResponse airline,
            @Schema(requiredMode = REQUIRED) AirportResponse from,
            @Schema(requiredMode = REQUIRED) AirportResponse to,
            @Schema(requiredMode = REQUIRED, example = "23:40") String departTime,
            @Schema(requiredMode = REQUIRED, example = "01:00") String arriveTime,
            @Schema(requiredMode = REQUIRED) boolean arrivesNextDay,
            @Schema(requiredMode = REQUIRED) int durationMinutes,
            @Schema(requiredMode = REQUIRED) long economyFare,
            @Schema(requiredMode = REQUIRED) int economySeats,
            @Schema(requiredMode = REQUIRED) int premiumEconomySeats,
            @Schema(requiredMode = REQUIRED) int businessSeats,
            @Schema(requiredMode = REQUIRED) int firstSeats,
            @Schema(requiredMode = REQUIRED) boolean timingEditable,
            @Schema(requiredMode = REQUIRED) boolean deletable) {
    }

    public record AdminFlightSchedulePageResponse(
            @Schema(requiredMode = REQUIRED) List<AdminFlightScheduleResponse> items,
            @Schema(requiredMode = REQUIRED) int page,
            @Schema(requiredMode = REQUIRED) int size,
            @Schema(requiredMode = REQUIRED) long totalItems,
            @Schema(requiredMode = REQUIRED) long totalPages) {
    }
}
