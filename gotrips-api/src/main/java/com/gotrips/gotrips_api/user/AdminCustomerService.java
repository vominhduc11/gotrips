package com.gotrips.gotrips_api.user;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import com.gotrips.gotrips_api.common.error.ResourceNotFoundException;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
class AdminCustomerService {

    private final AdminCustomerQuery query;

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public AdminCustomerPageResponse list(AdminCustomerFilters filters) {
        String pattern = filters.searchPattern();
        long total = query.count(pattern);
        int size = filters.pageSize();
        long totalPages = Math.max(1, Math.ceilDiv(total, size));
        int page = (int) Math.min(filters.pageNumber(), totalPages);
        var items = total == 0 ? List.<AdminCustomerResponse>of()
                : query.page(pattern, filters.order(), size, (long) (page - 1) * size);
        return new AdminCustomerPageResponse(items, page, size, total, totalPages);
    }

    @Transactional(readOnly = true)
    public AdminCustomerResponse get(UUID id) {
        return query.find(id).orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khách hàng."));
    }
}
