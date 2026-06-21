import sqlite3
import os
from datetime import datetime
import json

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
        conn.execute('''
            CREATE TABLE IF NOT EXISTS leaderboard (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                callsign TEXT UNIQUE NOT NULL,
                solved_stages TEXT DEFAULT '[]',
                solved_count INTEGER DEFAULT 0,
                elapsed_seconds INTEGER DEFAULT 0,
                session_start TIMESTAMP,
                session_end TIMESTAMP,
                status TEXT DEFAULT 'ACTIVE',
                score INTEGER DEFAULT 0,
                claimed_at TIMESTAMP,
                completion_time INTEGER,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
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

def create_or_update_session(callsign, start=True):
    with get_db() as conn:
        if start:
            now = datetime.now().isoformat()
            existing = conn.execute('SELECT callsign FROM leaderboard WHERE callsign = ?', (callsign,)).fetchone()
            if existing:
                conn.execute('''
                    UPDATE leaderboard
                    SET session_start = ?, status = 'ACTIVE'
                    WHERE callsign = ?
                ''', (now, callsign))
            else:
                conn.execute('''
                    INSERT INTO leaderboard (callsign, session_start, status, solved_stages, solved_count, score, elapsed_seconds)
                    VALUES (?, ?, 'ACTIVE', '[]', 0, 0, 0)
                ''', (callsign, now))
        conn.commit()

def quit_session(callsign):
    with get_db() as conn:
        now = datetime.now().isoformat()
        row = conn.execute('SELECT session_start FROM leaderboard WHERE callsign = ?', (callsign,)).fetchone()
        if row and row['session_start']:
            start = datetime.fromisoformat(row['session_start'])
            duration = int((datetime.now() - start).total_seconds())
            conn.execute('''
                UPDATE leaderboard
                SET session_end = ?, status = 'QUIT', completion_time = ?
                WHERE callsign = ?
            ''', (now, duration, callsign))
        else:
            conn.execute('''
                UPDATE leaderboard
                SET session_end = ?, status = 'QUIT'
                WHERE callsign = ?
            ''', (now, callsign))
        conn.commit()

def get_player_by_callsign(callsign):
    with get_db() as conn:
        row = conn.execute('SELECT * FROM leaderboard WHERE callsign = ?', (callsign,)).fetchone()
        return dict(row) if row else None

def claim_prize_db(callsign):
    with get_db() as conn:
        now = datetime.now().isoformat()
        row = conn.execute('SELECT session_start FROM leaderboard WHERE callsign = ?', (callsign,)).fetchone()
        if row and row['session_start']:
            start = datetime.fromisoformat(row['session_start'])
            completion = int((datetime.now() - start).total_seconds())
            conn.execute('''
                UPDATE leaderboard
                SET status = 'COMPLETED', claimed_at = ?, completion_time = ?
                WHERE callsign = ?
            ''', (now, completion, callsign))
        else:
            conn.execute('''
                UPDATE leaderboard
                SET status = 'COMPLETED', claimed_at = ?
                WHERE callsign = ?
            ''', (now, callsign))
        conn.commit()

def update_player_progress_db(callsign, solved_stages, elapsed_seconds):
    with get_db() as conn:
        solved_list = solved_stages if isinstance(solved_stages, list) else []
        solved_count = len(solved_list)
        score = solved_count * 500  # base points per stage
        conn.execute('''
            UPDATE leaderboard
            SET solved_stages = ?, solved_count = ?, score = ?, elapsed_seconds = ?, updated_at = CURRENT_TIMESTAMP
            WHERE callsign = ?
        ''', (json.dumps(solved_list), solved_count, score, elapsed_seconds, callsign))
        conn.commit()

def get_leaderboard():
    with get_db() as conn:
        rows = conn.execute('''
            SELECT callsign, solved_count, score, status,
                   session_start, session_end, completion_time,
                   claimed_at, elapsed_seconds
            FROM leaderboard
            ORDER BY score DESC, solved_count DESC, completion_time ASC NULLS LAST
        ''').fetchall()
        return [dict(row) for row in rows]

init_db()
