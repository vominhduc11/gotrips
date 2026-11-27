package com.gotrips.gotrips_api.flight;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface AirlineRepository extends JpaRepository<Airline, String> {

    List<Airline> findAllByOrderByCodeAsc();
}
