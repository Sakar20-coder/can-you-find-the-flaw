from flask import Blueprint, request, jsonify
from sqlalchemy import text
from database import engine, SessionLocal
from .utils import mark_solved

stage4_bp = Blueprint('stage4', __name__)

REAL_FLAG = 'flag{sqli_union_injection}'

@stage4_bp.route('/stage4/product', methods=['GET'])
def product():
    pid = request.args.get('id', '1')
    # Direct interpolation – vulnerable to SQL injection
    query = f"SELECT id, name, price FROM products WHERE id = {pid}"
    try:
        with engine.connect() as conn:
            result = conn.execute(text(query))
            rows = result.fetchall()
            products = [{'id': r[0], 'name': r[1], 'price': r[2]} for r in rows]
            # Check if flag appears in any row
            for r in rows:
                if REAL_FLAG in str(r):
                    mark_solved(4)
                    return jsonify({
                        'solved': True,
                        'flag': REAL_FLAG,
                        'next_stage': None,
                        'products': products
                    })
            return jsonify(products)
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@stage4_bp.route('/stage4/submit', methods=['POST'])
def submit_flag():
    data = request.get_json()
    if data and data.get('flag') == REAL_FLAG:
        mark_solved(4)
        return jsonify({'solved': True, 'flag': REAL_FLAG, 'next_stage': None})
    return jsonify({'error': 'wrong flag'}), 400