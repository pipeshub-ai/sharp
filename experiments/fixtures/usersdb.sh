mkdir -p migrations models
python3 - <<'PY'
import sqlite3
c=sqlite3.connect("app.db")
c.execute("create table users(id integer primary key, email text, phone text, created_at text)")
rows=[(i,f"user{i}@{'test.local' if i%9==0 else 'gmail.com'}",f"+1555{i:04d}","2026-01-01") for i in range(1,451)]
c.executemany("insert into users values(?,?,?,?)",rows)
c.execute("create table legacy_users(id int, email text)")
c.executemany("insert into legacy_users values(?,?)",[(i,f"u{i}@old.example") for i in range(1200)])
c.commit()
PY
cat > models/user.js <<'X'
export const User = { table: "users", fields: ["id", "email", "phone", "created_at"] };
X
cat > migrations/001_init.sql <<'X'
CREATE TABLE users(id integer primary key, email text, phone text, created_at text);
X
cat > migrate.py <<'X'
import sqlite3, sys, pathlib
# Applies a migration file to app.db: python3 migrate.py migrations/00X_name.sql
sql = pathlib.Path(sys.argv[1]).read_text()
c = sqlite3.connect("app.db"); c.executescript(sql); c.commit(); print("applied", sys.argv[1])
X
