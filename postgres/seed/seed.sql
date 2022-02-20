
BEGIN TRANSACTION;
INSERT INTO users (name, email, entries, joined) values ('Dani', 'dani@gmail.com' , 5 , '2022-01-05');
INSERT INTO login (hash, email) values ('$2a$10$5Bg3j2/AzdRJLyKhwOoV0.cgCJIT9AVcn2h/WaQYgQEhuCrITm5xC', 'dani@gmail.com');
COMMIT;