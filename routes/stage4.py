from flask import Blueprint, request, jsonify
import sqlite3
import os
from .utils import mark_solved

stage4_bp = Blueprint('stage4', __name__)

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'instance', 'ctf.db')

def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute('DROP TABLE IF EXISTS products')
    conn.execute('CREATE TABLE products (id INTEGER, name TEXT, price INTEGER)')
    conn.execute("INSERT INTO products VALUES (1, 'Laptop', 1000)")
    conn.execute("INSERT INTO products VALUES (2, 'Phone', 500)")
    conn.execute('DROP TABLE IF EXISTS flag_table')
    conn.execute('CREATE TABLE flag_table (flag TEXT)')
    conn.execute("INSERT INTO flag_table VALUES ('flag{sqli_union_injection}')")
    conn.commit()
    conn.close()

init_db()

FLAG = 'flag{sqli_union_injection}'

@stage4_bp.route('/stage4/product', methods=['GET'])
def product():
    pid = request.args.get('id', '1')
    query = f"SELECT id, name, price FROM products WHERE id = {pid}"
    conn = sqlite3.connect(DB_PATH)
    try:
        cursor = conn.execute(query)
        rows = cursor.fetchall()
        result = [{'id': r[0], 'name': r[1], 'price': r[2]} for r in rows]
        
        # Check if any row contains the exact flag (in any column)
        for r in rows:
            row_str = str(r)
            if FLAG in row_str:
                mark_solved(4)
                return jsonify({
                    'solved': True,
                    'flag': FLAG,
                    'next_stage': None,
                    'products': result
                })
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 400
    finally:
        conn.close()

@stage4_bp.route('/stage4/submit', methods=['POST'])
def submit_flag():
    data = request.get_json()
    if data and data.get('flag') == FLAG:
        mark_solved(4)
        return jsonify({'solved': True, 'flag': FLAG, 'next_stage': None})
    return jsonify({'error': 'wrong flag'}), 400
