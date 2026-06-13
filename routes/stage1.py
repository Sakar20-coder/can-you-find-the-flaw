from flask import Blueprint, request, jsonify
import jwt
import time
from .utils import mark_solved

stage1_bp = Blueprint('stage1', __name__)

@stage1_bp.route('/stage1/forgot', methods=['POST'])
def forgot_password():
    data = request.get_json()
    if not data or 'username' not in data:
        return jsonify({'error': 'Missing username'}), 400

    username = data['username']
    if username == 'admin':
        # Vulnerable: accepts 'none' algorithm
        token = jwt.encode(
            {'user': 'admin', 'exp': time.time() + 300, 'reset_allowed': False},
            key=None,
            algorithm='none'
        )
        return jsonify({'reset_token': token})
    else:
        return jsonify({'error': 'User not found'}), 404

@stage1_bp.route('/stage1/reset', methods=['POST'])
def reset_password():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not token:
        return jsonify({'error': 'Missing token'}), 401
    try:
        # No signature verification – accepts forged tokens
        payload = jwt.decode(token, options={'verify_signature': False})
        if payload.get('user') == 'admin' and payload.get('reset_allowed') == True:
            mark_solved(1)
            return jsonify({
                'solved': True,
                'flag': 'flag{jwt_none_algorithm_bug}',
                'next_stage': 2
            })
        else:
            return jsonify({'error': 'Invalid token'}), 403
    except:
        return jsonify({'error': 'Malformed token'}), 400
