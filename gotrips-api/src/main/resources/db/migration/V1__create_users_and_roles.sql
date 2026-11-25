-- Tài khoản và phân quyền (theo tài liệu MVP: users, roles, user_roles).

CREATE TABLE roles (
    id   integer     PRIMARY KEY,
    name varchar(30) NOT NULL,
    CONSTRAINT uq_roles_name UNIQUE (name)
);

-- Vai trò cố định, khớp enum RoleName trong code. id ghi tường minh để không phụ thuộc thứ tự chèn.
INSERT INTO roles (id, name) VALUES
    (1, 'CUSTOMER'),
    (2, 'STAFF'),
    (3, 'ADMIN');

CREATE TABLE users (
    id            uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    email         varchar(254) NOT NULL,
    -- Chuỗi băm kèm tiền tố thuật toán của DelegatingPasswordEncoder, ví dụ "{bcrypt}$2a$10$...".
    -- Không bao giờ lưu mật khẩu gốc.
    password_hash varchar(255) NOT NULL,
    full_name     varchar(100) NOT NULL,
    created_at    timestamptz  NOT NULL DEFAULT now(),
    updated_at    timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT uq_users_email UNIQUE (email),
    -- Email luôn lưu chữ thường để "A@x.com" và "a@x.com" là cùng một tài khoản
    CONSTRAINT ck_users_email_lowercase CHECK (email = lower(email))
);

CREATE TABLE user_roles (
    user_id uuid    NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    role_id integer NOT NULL REFERENCES roles (id),
    PRIMARY KEY (user_id, role_id)
);

-- Tra "người dùng có vai trò X" (khóa chính đã phủ chiều user_id -> role_id)
CREATE INDEX idx_user_roles_role_id ON user_roles (role_id);
