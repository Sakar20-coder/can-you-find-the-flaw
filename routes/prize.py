from flask import Blueprint, request, jsonify, session
from database import increment_winner_count, get_total_winners
import uuid

prize_bp = Blueprint('prize', __name__)

@prize_bp.route('/claim', methods=['POST'])
def claim_prize():
    solved = session.get('solved', [])
    required = [1,2,3,4]
    if all(s in solved for s in required):
        if session.get('claimed'):
            return jsonify({'error': 'Prize already claimed'}), 400
        session['claimed'] = True
        session.modified = True

        # Generate a unique session ID if not already present
        if '_id' not in session:
            session['_id'] = str(uuid.uuid4())
        session_id = session['_id']

        total = increment_winner_count(session_id)
        prize_token = f"PRIZE-{session_id[:8]}-{total}"
        return jsonify({
            'success': True,
            'message': 'You found all flaws! Show this QR code to claim your prize.',
            'qr_text': prize_token,
            'total_winners': total
        })
    else:
        missing = [s for s in required if s not in solved]
        return jsonify({'error': f'Missing stages: {missing}'}), 403
