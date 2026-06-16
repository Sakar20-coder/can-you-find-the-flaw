from flask import Blueprint, request, jsonify
import os
import lxml.etree as etree
from werkzeug.utils import secure_filename
from .utils import mark_solved

stage4_bp = Blueprint('stage4', __name__)
UPLOAD_DIR = '/tmp/avatars'
os.makedirs(UPLOAD_DIR, exist_ok=True)

FLAG_PATH = os.path.join(os.path.dirname(__file__), '..', 'instance', 'flag.txt')
if not os.path.exists(FLAG_PATH):
    with open(FLAG_PATH, 'w') as f:
        f.write('flag{xxe_vulnerability_advanced}')

@stage4_bp.route('/stage4/upload', methods=['POST'])
def upload_avatar():
    if 'file' not in request.files:
        return jsonify({'error': 'No file'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'Empty filename'}), 400
    filename = secure_filename(file.filename)
    filepath = os.path.join(UPLOAD_DIR, filename)
    file.save(filepath)

    try:
        # Force DTD loading and external entity resolution
        parser = etree.XMLParser(load_dtd=True, resolve_entities=True, no_network=False)
        tree = etree.parse(filepath, parser)
        root = tree.getroot()
        svg_str = etree.tostring(root, pretty_print=True).decode()
        
        with open(FLAG_PATH, 'r') as f:
            real_flag = f.read().strip()
        
        if real_flag in svg_str:
            mark_solved(4)
            return jsonify({'solved': True, 'flag': real_flag, 'next_stage': None})
        
        return jsonify({'message': 'Avatar uploaded', 'svg': svg_str})
    except Exception as e:
        return jsonify({'error': f'Invalid SVG: {str(e)}'}), 400

@stage4_bp.route('/stage4/submit', methods=['POST'])
def submit_flag():
    data = request.get_json()
    with open(FLAG_PATH, 'r') as f:
        real_flag = f.read().strip()
    if data and data.get('flag') == real_flag:
        mark_solved(4)
        return jsonify({'solved': True, 'flag': real_flag, 'next_stage': None})
    return jsonify({'error': 'wrong flag'}), 400
