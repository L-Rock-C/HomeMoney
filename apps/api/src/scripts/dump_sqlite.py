import sqlite3
import json
import os

db_path = os.path.join(os.path.dirname(__file__), '../../prisma/dev.db')
out_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../../data/sqlite_export.json'))
os.makedirs(os.path.dirname(out_path), exist_ok=True)

conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
c = conn.cursor()

data = {}
tables = ['User', 'Account', 'Category', 'Person', 'PaymentMethod', 'Transaction']
for t in tables:
    c.execute(f'SELECT * FROM "{t}"')
    data[t] = [dict(row) for row in c.fetchall()]
    print(f"Table {t}: {len(data[t])} rows")

with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"Successfully exported SQLite to {out_path}")
