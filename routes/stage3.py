from flask import Blueprint, request, jsonify
from .utils import mark_solved

stage3_bp = Blueprint('stage3', __name__)

@stage3_bp.route('/stage3/flag', methods=['GET'])
def get_flag():
    mark_solved(3)
    return jsonify({
        'solved': True,
        'flag': 'flag{placeholder_easy}',
        'next_stage': 4
    })
