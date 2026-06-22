from flask import Blueprint, request, jsonify
from .utils import mark_solved

stage3_bp = Blueprint('stage3', __name__)

# Simulated cache: stores responses under original URL path
cache = {}

@stage3_bp.route('/stage3/profile', methods=['GET'])
def profile():
    original_url = request.headers.get('X-Original-URL')
    requested_path = request.path

    # If X-Original-URL is present, treat as proxy rewrite – but DO NOT return flag immediately
    if original_url:
        if original_url == '/admin/flag':
            # The backend returns the flag, but the proxy caches it under the *original* path
            flag = 'flag{cache_poisoning_via_x_original_url}'
            # Store the flag in cache under the original path
            cache[requested_path] = {
                'flag': flag,
                'solved': True
            }
            # Return a generic success message – NOT the flag yet
            return jsonify({'message': 'Request processed and cached'})
        else:
            return jsonify({'error': 'Invalid internal path'}), 403

    # Normal request: check if cache exists for this path
    if requested_path in cache:
        # Cache hit – return the cached flag and mark solved
        cached_data = cache[requested_path]
        if cached_data.get('solved'):
            mark_solved(3)
            return jsonify({
                'solved': True,
                'flag': cached_data['flag'],
                'next_stage': 4
            })
        else:
            # Fallback – shouldn't happen
            return jsonify(cached_data)

    # If not cached, return normal profile
    return jsonify({'profile': {'username': 'guest', 'email': 'guest@example.com'}})
