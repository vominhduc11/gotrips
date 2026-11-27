package com.gotrips.gotrips_api.user;

import java.util.List;
import java.util.UUID;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.gotrips.gotrips_api.common.error.ConflictException;
import com.gotrips.gotrips_api.common.error.ResourceNotFoundException;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
class AdminStaffService {

    private final RoleRepository roles;
    private final UserRepository users;
    private final UserAccountCreator accounts;
    private final AdminStaffMapper mapper;

    @Transactional(readOnly = true)
    public List<AdminStaffResponse> list() {
        return users.findStaffWithRoles().stream().map(mapper::toResponse).toList();
    }

    @Transactional
    public AdminStaffResponse create(UUID actorId, AdminCreateStaffRequest request) {
        lockAdminRoleAndCheckActor(actorId);
        return mapper.toResponse(accounts.create(request.fullName(), request.email(), request.password(),
                request.role().roleName()));
    }

    @Transactional
    public AdminStaffResponse updateRole(UUID actorId, UUID id, AdminStaffRole role) {
        User target = prepareRoleChange(actorId, id, role == AdminStaffRole.ADMIN);
        Role granted = roles.findByName(role.roleName())
                .orElseThrow(() -> new IllegalStateException("Thiếu vai trò nhân viên trong bảng roles."));
        target.replaceStaffRole(granted);
        return mapper.toResponse(target);
    }

    @Transactional
    public void revokeRole(UUID actorId, UUID id) {
        prepareRoleChange(actorId, id, false).replaceStaffRole(null);
    }

    private User prepareRoleChange(UUID actorId, UUID id, boolean keepAdmin) {
        lockAdminRoleAndCheckActor(actorId);
        if (actorId.equals(id)) {
            throw new ConflictException("Bạn không thể tự đổi hoặc thu hồi quyền của mình.");
        }
        User target = users.lockById(id).filter(User::hasStaffAccess)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nhân viên."));
        if (!keepAdmin && target.hasRole(RoleName.ADMIN) && users.countWithRole(RoleName.ADMIN) <= 1) {
            throw new ConflictException("Hệ thống phải còn ít nhất một quản trị viên.");
        }
        return target;
    }

    private void lockAdminRoleAndCheckActor(UUID actorId) {
        // Cùng khoá một dòng trước khi đọc quyền để hai ADMIN không thể đồng thời thu hồi quyền của nhau.
        roles.lockByName(RoleName.ADMIN)
                .orElseThrow(() -> new IllegalStateException("Thiếu vai trò ADMIN trong bảng roles."));
        if (!users.hasRole(actorId, RoleName.ADMIN)) {
            throw new AccessDeniedException("Tài khoản không còn quyền quản trị viên.");
        }
    }
}
