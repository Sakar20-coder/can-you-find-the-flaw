from flask import Blueprint, request, jsonify
from .utils import mark_solved

stage3_bp = Blueprint('stage3', __name__)

# Simulated reverse proxy cache
cache = {}

@stage3_bp.route('/stage3/profile', methods=['GET'])
def profile():
    original_url = request.headers.get('X-Original-URL')
    requested_path = request.path

    # If X-Original-URL is present, treat as a proxy rewrite
    if original_url:
        if original_url == '/admin/flag':
            flag = 'flag{cache_poisoning_via_x_original_url}'
            # Cache the response under the original path
            cache[requested_path] = {
                'solved': True,
                'flag': flag,
                'next_stage': 4
            }
            # ✅ CRITICAL: Mark stage 3 as solved on the server
            mark_solved(3)
            return jsonify({
                'solved': True,
                'flag': flag,
                'next_stage': 4
            })
        else:
            return jsonify({'error': 'Invalid internal path'}), 403

    # Normal request: check cache first
    if requested_path in cache:
        return jsonify(cache[requested_path])

    # Default profile (not cached)
    return jsonify({'profile': {'username': 'guest', 'email': 'guest@example.com'}})