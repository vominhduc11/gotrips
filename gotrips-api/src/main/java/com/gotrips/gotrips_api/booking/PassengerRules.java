package com.gotrips.gotrips_api.booking;

import java.time.LocalDate;
import java.time.Period;

import com.gotrips.gotrips_api.common.error.InvalidRequestException;

/**
 * Luật tuổi hành khách bay: hàm thuần. Tuổi tính theo NGÀY BAY CHIỀU ĐI (cách hãng bay nội địa phân loại). Trẻ em và em
 * bé bắt buộc có ngày sinh. Câu chữ khớp {@code lib/schemas/flight-booking.ts} của gotrips-web: đổi một nơi phải đổi
 * nơi kia.
 */
public final class PassengerRules {

    static final String BIRTH_DATE_REQUIRED_MESSAGE = "Vui lòng nhập ngày sinh để kiểm tra độ tuổi.";
    static final String BIRTH_DATE_IN_FUTURE_MESSAGE = "Ngày sinh không được sau hôm nay.";

    private PassengerRules() {
    }

    /** Số năm đủ của người sinh ngày {@code dateOfBirth} tính tới {@code onDate} (như {@code differenceInYears}). */
    public static int ageOn(LocalDate dateOfBirth, LocalDate onDate) {
        return Period.between(dateOfBirth, onDate).getYears();
    }

    /** Ném {@link InvalidRequestException} gắn vào {@code field} nếu ngày sinh không hợp với loại hành khách. */
    public static void validate(PassengerType type, LocalDate dateOfBirth, LocalDate departDate, LocalDate today,
            String field) {
        if (dateOfBirth == null) {
            if (type != PassengerType.ADULT) {
                throw new InvalidRequestException(field, BIRTH_DATE_REQUIRED_MESSAGE);
            }
            return;
        }
        if (dateOfBirth.isAfter(today)) {
            throw new InvalidRequestException(field, BIRTH_DATE_IN_FUTURE_MESSAGE);
        }
        int age = ageOn(dateOfBirth, departDate);
        boolean valid = switch (type) {
            case ADULT -> age >= 12;
            case CHILD -> age >= 2 && age <= 11;
            case INFANT -> age <= 1;
        };
        if (!valid) {
            throw new InvalidRequestException(field, ageMessage(type));
        }
    }

    private static String ageMessage(PassengerType type) {
        return switch (type) {
            case ADULT -> "Người lớn phải từ 12 tuổi trở lên vào ngày bay.";
            case CHILD -> "Trẻ em phải từ 2 đến dưới 12 tuổi vào ngày bay.";
            case INFANT -> "Em bé phải dưới 2 tuổi vào ngày bay.";
        };
    }
}
