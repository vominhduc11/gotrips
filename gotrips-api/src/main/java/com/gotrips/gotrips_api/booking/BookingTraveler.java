package com.gotrips.gotrips_api.booking;

import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Một người đi tour hoặc một hành khách bay trong đơn. */
@Entity
@Table(name = "booking_travelers")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class BookingTraveler {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_id", nullable = false, updatable = false)
    private Booking booking;

    /** Thứ tự khách nhập trong form. */
    @Column(name = "traveler_index", nullable = false)
    private int travelerIndex;

    /** Chỉ đơn vé máy bay; đơn tour để trống. */
    @Enumerated(EnumType.STRING)
    @Column(name = "passenger_type", length = 10)
    private PassengerType passengerType;

    @Column(name = "full_name", nullable = false, length = 100)
    private String fullName;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    BookingTraveler(Booking booking, int travelerIndex, PassengerType passengerType, String fullName,
            LocalDate dateOfBirth) {
        this.booking = booking;
        this.travelerIndex = travelerIndex;
        this.passengerType = passengerType;
        this.fullName = fullName;
        this.dateOfBirth = dateOfBirth;
    }
}
