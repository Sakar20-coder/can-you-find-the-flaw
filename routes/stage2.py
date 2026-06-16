from flask import Blueprint, request, jsonify
from .utils import mark_solved

stage2_bp = Blueprint('stage2', __name__)

@stage2_bp.route('/stage2/flag', methods=['GET'])
def flag_endpoint():
    callback = request.args.get('callback')
    if not callback:
        return jsonify({'error': 'Missing callback parameter'}), 400
    flag = 'flag{jsonp_data_leak}'
    return f"{callback}({jsonify({'flag': flag}).get_data(as_text=True)})", 200, {'Content-Type': 'application/javascript'}

@stage2_bp.route('/stage2/submit', methods=['POST'])
def submit_flag():
    data = request.get_json()
    if data and data.get('flag') == 'flag{jsonp_data_leak}':
        mark_solved(2)
        return jsonify({'solved': True, 'flag': data.get('flag'), 'next_stage': 3})
    return jsonify({'error': 'wrong flag'}), 400
