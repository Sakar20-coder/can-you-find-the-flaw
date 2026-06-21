from flask import Blueprint, request, jsonify
import sqlite3
import os
from .utils import mark_solved

stage4_bp = Blueprint('stage4', __name__)

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'instance', 'ctf.db')

def init_sqli_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute('CREATE TABLE IF NOT EXISTS products (id INTEGER, name TEXT, price INTEGER)')
    conn.execute("INSERT OR IGNORE INTO products VALUES (1, 'Laptop', 1000)")
    conn.execute("INSERT OR IGNORE INTO products VALUES (2, 'Phone', 500)")
    conn.execute("CREATE TABLE IF NOT EXISTS flag_table (secret TEXT)")
    conn.execute("INSERT OR IGNORE INTO flag_table VALUES ('flag{sqli_blind_injection}')")
    conn.commit()
    conn.close()

init_sqli_db()

@stage4_bp.route('/stage4/products', methods=['GET'])
def products():
    sort = request.args.get('sort', 'name')
    query = f"SELECT id, name, price FROM products ORDER BY {sort}"
    conn = sqlite3.connect(DB_PATH)
    try:
        cursor = conn.execute(query)
        rows = cursor.fetchall()
        return jsonify([{'id': r[0], 'name': r[1], 'price': r[2]} for r in rows])
    except Exception:
        return jsonify({'error': 'Invalid sort parameter'}), 400
    finally:
        conn.close()

@stage4_bp.route('/stage4/submit', methods=['POST'])
def submit_flag():
    data = request.get_json()
    if data and data.get('flag') == 'flag{sqli_blind_injection}':
        mark_solved(4)
        return jsonify({'solved': True, 'flag': data.get('flag'), 'next_stage': None})
    return jsonify({'error': 'wrong flag'}), 400
