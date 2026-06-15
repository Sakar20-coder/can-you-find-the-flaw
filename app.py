from flask import Flask, session, render_template, jsonify, request
from database import get_total_winners

# Import only stage blueprints – NOT hints_bp (to avoid route conflicts)
from routes import stage1_bp, stage2_bp, stage3_bp, stage4_bp, prize_bp

app = Flask(__name__)
app.secret_key = 'your-secret-key-change-this-in-production'

# Register stage blueprints only (hints are handled by app routes below)
app.register_blueprint(stage1_bp, url_prefix='/api')
app.register_blueprint(stage2_bp, url_prefix='/api')
app.register_blueprint(stage3_bp, url_prefix='/api')
app.register_blueprint(stage4_bp, url_prefix='/api')
app.register_blueprint(prize_bp, url_prefix='/api')

# ========== MAIN ROUTES ==========

@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/set_callsign', methods=['POST'])
def set_callsign():
    from flask import request, session, jsonify
    data = request.get_json()
    callsign = data.get('callsign', '').strip()
    if callsign:
        session['callsign'] = callsign
        if 'solved' not in session:
            session['solved'] = []
        print(f"[DEBUG] Callsign set: {callsign}")   # optional, helps verify
        return jsonify({'status': 'ok'}), 200
    return jsonify({'error': 'Invalid callsign'}), 400

@app.route('/api/check_solved')
def api_check_solved():
    """Returns solved stages AND callsign – required by frontend."""
    return jsonify({
        'solved': session.get('solved', []),
        'callsign': session.get('callsign', '')
    })

@app.route('/api/hint/<int:stage>')
def api_hint(stage):
    hints = {
        1: "Try changing JWT algorithm to 'none' and remove the signature.",
        2: "Use ?callback=anything to leak the flag from the JSONP response.",
        3: "Blind boolean injection in ORDER BY clause – use CASE WHEN.",
        4: "Upload SVG with XXE payload to read ../instance/flag.txt"
    }
    return jsonify({'hint': hints.get(stage, 'No hint available')})

@app.route('/api/claim', methods=['POST'])
def api_claim():
    solved = session.get('solved', [])
    if len(solved) >= 4:
        import hashlib
        token_str = f"{session.get('callsign')}-{sorted(solved)}"
        token = hashlib.md5(token_str.encode()).hexdigest()[:16].upper()
        total_winners = get_total_winners()
        return jsonify({
            'success': True,
            'message': 'Congratulations! You have mastered all flaws.',
            'qr_text': f'CTF-PRIZE-{token}',
            'total_winners': total_winners
        })
    else:
        return jsonify({'success': False, 'error': 'Complete all 4 stages first'}), 400

@app.route('/api/counter')
def api_counter():
    return jsonify({'total': get_total_winners()})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)


@app.route('/api/leaderboard')
def leaderboard():
    from database import get_leaderboard
    return jsonify(get_leaderboard())

@app.route('/api/update_progress', methods=['POST'])
def update_progress():
    data = request.get_json()
    callsign = session.get('callsign')
    if not callsign:
        return jsonify({'error': 'Unauthorized'}), 401
    from database import update_player_progress
    update_player_progress(callsign, data['solved'], data['elapsed_seconds'])
    return jsonify({'status': 'ok'})