import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'instance', 'ctf.db')

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_db() as conn:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS winners (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT UNIQUE,
                claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        conn.execute('''
            CREATE TABLE IF NOT EXISTS global_counter (
                id INTEGER PRIMARY KEY CHECK (id=1),
                total INTEGER DEFAULT 0
            )
        ''')
        conn.execute('INSERT OR IGNORE INTO global_counter (id, total) VALUES (1, 0)')
        conn.commit()

def increment_winner_count(session_id):
    with get_db() as conn:
        existing = conn.execute('SELECT 1 FROM winners WHERE session_id = ?', (session_id,)).fetchone()
        if existing:
            return get_total_winners()
        conn.execute('INSERT INTO winners (session_id) VALUES (?)', (session_id,))
        conn.execute('UPDATE global_counter SET total = total + 1 WHERE id = 1')
        conn.commit()
        return get_total_winners()

def get_total_winners():
    with get_db() as conn:
        row = conn.execute('SELECT total FROM global_counter WHERE id = 1').fetchone()
        return row['total'] if row else 0

init_db()
