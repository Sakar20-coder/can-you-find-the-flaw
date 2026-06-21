from flask import Blueprint, request, jsonify
from .utils import mark_solved

stage3_bp = Blueprint('stage3', __name__)

# Simulated reverse proxy cache: stores responses under original URL path
cache = {}

@stage3_bp.route('/stage3/profile', methods=['GET'])
def profile():
    # Simulate proxy behaviour: X-Original-URL rewrites the path
    original_url = request.headers.get('X-Original-URL')
    requested_path = request.path

    # If X-Original-URL is present, the proxy rewrites the request
    if original_url:
        if original_url == '/admin/flag':
            # Backend returns flag (proxy's internal IP is trusted)
            flag = 'flag{cache_poisoning_via_x_original_url}'
            # Cache the response under the *original* URL path (not rewritten)
            cache[requested_path] = {
                'solved': True,
                'flag': flag,
                'next_stage': 4
            }
            return jsonify({
                'solved': True,
                'flag': flag,
                'next_stage': 4
            })
        else:
            return jsonify({'error': 'Invalid internal path'}), 403

    # Normal request: check if cache exists for this path
    if requested_path in cache:
        return jsonify(cache[requested_path])

    # If not cached, return normal profile
    return jsonify({'profile': {'username': 'guest', 'email': 'guest@example.com'}})