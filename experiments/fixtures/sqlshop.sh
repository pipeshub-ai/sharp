python3 - <<'PY'
import sqlite3, random
random.seed(3)
c=sqlite3.connect("shop.db")
c.executescript("""
create table customers(id integer primary key, name text, email text);
create table addresses(id integer primary key, customer_id int, city text);
create table orders(id integer primary key, customer_id int, total_cents int, created_at text);
""")
for i in range(1,201):
    c.execute("insert into customers values(?,?,?)",(i,f"Customer {i}",f"c{i}@shop.example"))
    for a in range(random.choice([1,1,2,3])): c.execute("insert into addresses(customer_id,city) values(?,?)",(i,random.choice(["Pune","Austin","Berlin"])))
    for o in range(random.randint(0,6)): c.execute("insert into orders(customer_id,total_cents,created_at) values(?,?,?)",(i,random.randint(500,90000),f"2026-0{random.randint(1,9)}-1{random.randint(0,9)}"))
c.commit()
PY
cat > report.sql <<'X'
-- Revenue per customer for the sales dashboard.
SELECT c.name, a.city, SUM(o.total_cents) / 100.0 AS revenue
FROM customers c
JOIN addresses a ON a.customer_id = c.id
JOIN orders o ON o.customer_id = c.id
GROUP BY c.id
ORDER BY revenue DESC;
X
echo "sqlite3 is not installed; use: python3 -c \"import sqlite3; ...\"" > README.md
