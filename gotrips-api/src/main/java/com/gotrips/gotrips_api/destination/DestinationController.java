package com.gotrips.gotrips_api.destination;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/** Điểm đến (công khai, không cần token). */
@RestController
@RequestMapping("/destinations")
@RequiredArgsConstructor
@Tag(name = "Điểm đến", description = "Danh sách điểm đến công khai cho website")
public class DestinationController {

    private final DestinationService destinationService;

    @Operation(operationId = "listDestinations", summary = "Danh sách điểm đến kèm số tour đang mở bán",
            description = "Công khai. Thứ tự theo id. tourCount chỉ đếm tour ACTIVE.")
    @GetMapping
    public List<DestinationResponse> list() {
        return destinationService.listAll();
    }
}
