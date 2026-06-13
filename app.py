from flask import Flask, session, render_template, jsonify
from database import get_total_winners
from routes import stage1_bp, stage2_bp, stage3_bp, stage4_bp, hints_bp, prize_bp

app = Flask(__name__)
app.secret_key = 'your-secret-key-change-this-in-production'

app.register_blueprint(stage1_bp, url_prefix='/api')
app.register_blueprint(stage2_bp, url_prefix='/api')
app.register_blueprint(stage3_bp, url_prefix='/api')
app.register_blueprint(stage4_bp, url_prefix='/api')
app.register_blueprint(hints_bp, url_prefix='/api')
app.register_blueprint(prize_bp, url_prefix='/api')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/check_solved')
def api_check_solved():
    return jsonify({'solved': session.get('solved', [])})

@app.route('/api/counter')
def api_counter():
    return jsonify({'total': get_total_winners()})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
