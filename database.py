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
    # Add this inside your init_db() function (after the existing tables)
def init_db():
    with get_db() as conn:
        # ... your existing winners and global_counter tables ...
        
        # NEW: players table for leaderboard
        conn.execute('''
            CREATE TABLE IF NOT EXISTS players (
                callsign TEXT PRIMARY KEY,
                solved_stages TEXT,
                solved_count INTEGER DEFAULT 0,
                elapsed_seconds INTEGER DEFAULT 0
            )
        ''')
        # ... rest of your init_db() (commit etc.)

# Add these new functions at the end of the file

def update_player_progress(callsign, solved_stages, elapsed_seconds):
    """Store or update a player's progress for leaderboard."""
    with get_db() as conn:
        solved_count = len(solved_stages)
        existing = conn.execute('SELECT 1 FROM players WHERE callsign = ?', (callsign,)).fetchone()
        if existing:
            conn.execute('''
                UPDATE players
                SET solved_stages = ?, solved_count = ?, elapsed_seconds = ?
                WHERE callsign = ?
            ''', (','.join(map(str, solved_stages)), solved_count, elapsed_seconds, callsign))
        else:
            conn.execute('''
                INSERT INTO players (callsign, solved_stages, solved_count, elapsed_seconds)
                VALUES (?, ?, ?, ?)
            ''', (callsign, ','.join(map(str, solved_stages)), solved_count, elapsed_seconds))
        conn.commit()

def get_leaderboard(limit=50):
    """Return top players sorted by solved_count DESC, then elapsed_seconds ASC."""
    with get_db() as conn:
        rows = conn.execute('''
            SELECT callsign, solved_count, elapsed_seconds
            FROM players
            WHERE solved_count > 0
            ORDER BY solved_count DESC, elapsed_seconds ASC
            LIMIT ?
        ''', (limit,)).fetchall()
        return [{'callsign': r['callsign'], 'solved_count': r['solved_count'], 'elapsed_seconds': r['elapsed_seconds']} for r in rows]

init_db()

