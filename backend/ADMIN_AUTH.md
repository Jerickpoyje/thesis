Admin authentication — setup

This project expects a Supabase table named `admin_accounts` with at least these columns:

- `id` (uuid, primary key) or integer id
- `email` (text, unique)
- `password_hash` (text)
- `created_at` (timestamp, default: now())

Create table example (SQL, run in Supabase SQL editor):

```sql
create table if not exists admin_accounts (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  created_at timestamptz default now()
);
```

If you want editable profile fields in the admin panel, extend `admin_accounts` with optional columns like:

```sql
alter table admin_accounts add column if not exists full_name text;
alter table admin_accounts add column if not exists role text;
```

Admin credentials should live only in Supabase, not in the source code.

Passwords are never stored as plain text. Supabase will show the email and the hashed password value in `admin_accounts`; the backend verifies the hash during login.

Generate an initial password hash using the same PBKDF2 routine used by the backend. Run this small Python snippet locally and paste the resulting hash into the `password_hash` column when inserting the admin row.

```python
import os
import hashlib
import binascii

def hash_password(password: str, iterations: int = 100000) -> str:
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, iterations)
    return f"pbkdf2_sha256${iterations}${binascii.hexlify(salt).decode()}${binascii.hexlify(dk).decode()}"

print(hash_password('YourInitialAdminPassword1'))
```

Insert example using your admin email:

```sql
insert into admin_accounts (email, password_hash) values (
  '<YOUR_ADMIN_EMAIL>',
  '<PASTE_HASH_HERE>'
);
```

If you want to create the hash for your chosen password, run the snippet above locally and paste the generated hash into Supabase. Do not store the plain password anywhere in the database or source code.

API endpoints (backend must be running):

- POST `/admin/login` — body: `{"email":"...","password":"..."}`
  - Returns `200` + `{ "status": "ok", "access_token": "...", "token_type": "bearer" }` on success.

- POST `/admin/account/change-password` — body: `{"currentPassword":"...","newPassword":"..."}`
  - Requires `Authorization: Bearer <access_token>`.
  - Returns `200` + `{ "status": "ok" }` on success.

Environment variables

- `ADMIN_JWT_SECRET` must be set to a long random secret.
- `ADMIN_JWT_ALGORITHM` defaults to `HS256`.
- `ADMIN_JWT_EXP_MINUTES` defaults to `480`.

Notes
- The backend uses PBKDF2-SHA256 for password hashing (100000 iterations).
- Successful login now issues a signed JWT from the backend and the frontend stores it locally for subsequent admin requests.
- Ensure `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are configured in your environment (backend `.env`).
