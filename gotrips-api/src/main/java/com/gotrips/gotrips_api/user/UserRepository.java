package com.gotrips.gotrips_api.user;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import jakarta.persistence.LockModeType;

public interface UserRepository extends JpaRepository<User, UUID> {

    boolean existsByEmail(String email);

    // Nạp luôn roles trong một câu truy vấn: service cần vai trò để cấp token / trả về cho client.
    @EntityGraph(attributePaths = "roles")
    Optional<User> findByEmail(String email);

    @EntityGraph(attributePaths = "roles")
    Optional<User> findWithRolesById(UUID id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from User u where u.id = :id")
    Optional<User> lockById(UUID id);

    @Query("select count(u) > 0 from User u join u.roles r where u.id = :id and r.name = :role")
    boolean hasRole(UUID id, RoleName role);

    @Query("select count(u) from User u join u.roles r where r.name = :role")
    long countWithRole(RoleName role);

    @EntityGraph(attributePaths = "roles")
    @Query("""
            select u from User u
            where exists (select 1 from u.roles r where r.name in (STAFF, ADMIN))
            order by lower(u.fullName), u.id
            """)
    List<User> findStaffWithRoles();
}
