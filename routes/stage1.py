from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
from .utils import mark_solved

stage1_bp = Blueprint('stage1', __name__)

# In-memory store for rate limiting (IP -> list of timestamps)
attempts = {}

def get_client_ip():
    # Vulnerable: takes the LAST IP from X-Forwarded-For
    xff = request.headers.get('X-Forwarded-For')
    if xff:
        return xff.split(',')[-1].strip()
    return request.remote_addr

# Internal notes endpoint – hidden, but no auth beyond a simple header
@stage1_bp.route('/internal/notes', methods=['GET'])
def internal_notes():
    if request.headers.get('X-Admin') == 'true':
        return jsonify({'pet_name': 'Fluffy'})
    return jsonify({'error': 'Unauthorized'}), 403

@stage1_bp.route('/stage1/forgot', methods=['POST'])
def forgot_password():
    data = request.get_json()
    if not data or 'answer' not in data:
        return jsonify({'error': 'Missing answer'}), 400

    ip = get_client_ip()
    now = datetime.now()

    # Clean old attempts (older than 1 hour)
    if ip in attempts:
        attempts[ip] = [t for t in attempts[ip] if now - t < timedelta(hours=1)]

    # Check rate limit: 3 attempts per hour
    if len(attempts.get(ip, [])) >= 3:
        return jsonify({'error': 'Rate limit exceeded. Try again later.'}), 429

    attempts.setdefault(ip, []).append(now)

    # Security question answer (pet name from /internal/notes)
    if data['answer'] == 'Fluffy':
        mark_solved(1)
        return jsonify({
            'solved': True,
            'flag': 'flag{rate_limiting_is_hard}',
            'next_stage': 2
        })
    else:
        return jsonify({'error': 'Wrong answer'}), 403