ALTER TABLE users
    ADD COLUMN phone varchar(30),
    ADD CONSTRAINT users_phone_not_blank CHECK (phone IS NULL OR btrim(phone) <> '');
