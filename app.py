from flask import Flask, session, render_template, jsonify, request, redirect
from datetime import datetime
import uuid
from database import (
    get_total_winners, get_leaderboard, update_player_progress_db,
    get_player_by_callsign, create_or_update_session, quit_session, claim_prize_db
)
from routes import stage1_bp, stage2_bp, stage3_bp, stage4_bp, prize_bp

app = Flask(__name__)
app.secret_key = 'your-secret-key-change-this-in-production'

app.register_blueprint(stage1_bp, url_prefix='/api')
app.register_blueprint(stage2_bp, url_prefix='/api')
app.register_blueprint(stage3_bp, url_prefix='/api')
app.register_blueprint(stage4_bp, url_prefix='/api')
app.register_blueprint(prize_bp, url_prefix='/api')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/set_callsign', methods=['POST'])
def set_callsign():
    data = request.get_json()
    callsign = data.get('callsign', '').strip()
    if callsign:
        session['callsign'] = callsign
        if 'solved' not in session:
            session['solved'] = []
        create_or_update_session(callsign, start=True)
        return jsonify({'status': 'ok'}), 200
    return jsonify({'error': 'Invalid callsign'}), 400

@app.route('/api/check_solved')
def api_check_solved():
    return jsonify({
        'solved': session.get('solved', []),
        'callsign': session.get('callsign', '')
    })

@app.route('/api/hint/<int:stage>')
def api_hint(stage):
    hints = {
        1: "Try fetching /api/internal/notes with X-Admin: true first. Then cycle X-Forwarded-For IPs to bypass the rate limit.",
        2: "Use ?callback=anything to leak the flag from the JSONP response.",
        3: "Send a request to /profile with X-Original-URL: /admin/flag to poison the cache. Then visit /profile again (without the header) to retrieve the flag from cache.",
        4: "First, find all tables using UNION SELECT NULL, name, NULL FROM sqlite_master. Then discover columns and extract the flag."
    }
    return jsonify({'hint': hints.get(stage, 'No hint available')})

@app.route('/api/claim', methods=['POST'])
def api_claim():
    solved = session.get('solved', [])
    if len(solved) >= 4:
        import hashlib
        callsign = session.get('callsign')
        if not callsign:
            return jsonify({'error': 'No callsign'}), 401
        claim_prize_db(callsign)
        session_id = session.get('_id', str(uuid.uuid4()))
        session['_id'] = session_id
        total = get_total_winners()
        token_str = f"{callsign}-{sorted(solved)}"
        token = hashlib.md5(token_str.encode()).hexdigest()[:16].upper()
        return jsonify({
            'success': True,
            'message': 'Congratulations! You have mastered all flaws.',
            'qr_text': f'CTF-PRIZE-{token}',
            'total_winners': total
        })
    else:
        return jsonify({'success': False, 'error': 'Complete all 4 stages first'}), 400

@app.route('/api/counter')
def api_counter():
    return jsonify({'total': get_total_winners()})

@app.route('/api/leaderboard')
def leaderboard():
    return jsonify(get_leaderboard())

@app.route('/api/update_progress', methods=['POST'])
def update_progress():
    data = request.get_json()
    callsign = session.get('callsign')
    if not callsign:
        return jsonify({'error': 'Unauthorized'}), 401
    solved = data.get('solved', [])
    elapsed = data.get('elapsed_seconds', 0)
    update_player_progress_db(callsign, solved, elapsed)
    return jsonify({'status': 'ok'})

@app.route('/api/quit_session', methods=['POST'])
def quit_session_route():
    callsign = session.get('callsign')
    if not callsign:
        return jsonify({'error': 'Unauthorized'}), 401
    quit_session(callsign)
    session.clear()
    return jsonify({'status': 'quit', 'redirect': '/summary'})

@app.route('/api/session_status')
def session_status():
    callsign = session.get('callsign')
    if not callsign:
        return jsonify({'error': 'No session'}), 401
    player = get_player_by_callsign(callsign)
    if not player:
        return jsonify({'error': 'Not found'}), 404
    elapsed = 0
    if player.get('session_start'):
        start = datetime.fromisoformat(player['session_start'])
        if player['status'] in ('ACTIVE',):
            elapsed = int((datetime.now() - start).total_seconds())
        else:
            elapsed = player.get('completion_time', 0)
    return jsonify({
        'start': player.get('session_start'),
        'elapsed': elapsed,
        'status': player['status'],
        'solved': session.get('solved', []),
        'score': player.get('score', 0)
    })

@app.route('/summary')
def summary():
    callsign = session.get('callsign')
    if not callsign:
        return redirect('/')
    player = get_player_by_callsign(callsign)
    return render_template('summary.html', player=player)

@app.route('/admin')
def admin_dashboard():
    players = get_leaderboard()
    total = len(players)
    active = sum(1 for p in players if p['status'] == 'ACTIVE')
    completed = sum(1 for p in players if p['status'] == 'COMPLETED')
    quit_count = sum(1 for p in players if p['status'] == 'QUIT')
    return render_template('admin.html', players=players, total=total, active=active, completed=completed, quit_count=quit_count)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)