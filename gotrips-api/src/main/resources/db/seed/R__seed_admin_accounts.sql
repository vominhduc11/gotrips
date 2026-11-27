-- Chỉ nạp với profile seed. Chỉ gán quyền cho dòng vừa chèn để không nâng quyền tài khoản có sẵn.
WITH accounts (email, full_name, password_hash, role_name) AS (
    VALUES
        ('admin@gotrips.test', 'Quản trị GoTrips', '{bcrypt}$2a$10$U2sX9s5KSciWJjN.rK0WfOpfgFJ4ieChD4e0Cxo5jkmgXJMl0c2hW', 'ADMIN'),
        ('staff@gotrips.test', 'Nhân viên GoTrips', '{bcrypt}$2a$10$aHygGUfLl9SLN454aQaTHORRTuDIy71Q9OjnYCcnMYKc3Rwtlwtce', 'STAFF')
), inserted AS (
    INSERT INTO users (email, full_name, password_hash)
    SELECT email, full_name, password_hash FROM accounts
    ON CONFLICT (email) DO NOTHING
    RETURNING id, email
)
INSERT INTO user_roles (user_id, role_id)
SELECT inserted.id, roles.id
FROM inserted
JOIN accounts USING (email)
JOIN roles ON roles.name = accounts.role_name;
