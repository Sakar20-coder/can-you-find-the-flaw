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
        conn.execute('''
            CREATE TABLE IF NOT EXISTS player_progress (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                callsign TEXT UNIQUE,
                stages_solved INTEGER DEFAULT 0,
                elapsed_seconds INTEGER DEFAULT 0,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

def get_leaderboard():
    with get_db() as conn:
        rows = conn.execute('''
            SELECT callsign, stages_solved, elapsed_seconds, updated_at
            FROM player_progress
            ORDER BY stages_solved DESC, elapsed_seconds ASC
            LIMIT 20
        ''').fetchall()
        return [dict(row) for row in rows]

def update_player_progress(callsign, solved, elapsed_seconds):
    with get_db() as conn:
        conn.execute('''
            INSERT INTO player_progress (callsign, stages_solved, elapsed_seconds)
            VALUES (?, ?, ?)
            ON CONFLICT(callsign) DO UPDATE SET
                stages_solved = excluded.stages_solved,
                elapsed_seconds = excluded.elapsed_seconds,
                updated_at = CURRENT_TIMESTAMP
        ''', (callsign, len(solved), elapsed_seconds))
        conn.commit()

init_db()
