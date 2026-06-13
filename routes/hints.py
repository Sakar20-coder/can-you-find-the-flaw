from flask import Blueprint, request, jsonify, session

hints_bp = Blueprint('hints', __name__)

HINTS = {
    1: [
        "The reset token looks like three dots separated. The middle part contains claims.",
        "Some libraries let you skip signature verification. What happens if you change the algorithm?",
        "Try setting 'alg' to 'none' and add a new claim 'reset_allowed' with true. Remove the signature part.",
        "Send the forged token in the Authorization header as a Bearer token."
    ],
    2: [
        "The /flag endpoint reacts to a query parameter that starts with 'call'. Why would that exist?",
        "JSONP is a technique to bypass origin restrictions. An attacker can steal data by including a script tag.",
        "Create an HTML file that defines a function matching the callback name, then load the script.",
        "Extract the flag from the response and submit it via POST to /submit."
    ],
    3: [
        "The 'sort' parameter is injected directly into an SQL query. Can you influence the sort order?",
        "Use a CASE WHEN statement to create a boolean condition. Observe which product appears first.",
        "You need to extract a hidden value from another table (flag_table) character by character.",
        "Example: ?sort=CASE WHEN (SELECT substr(secret,1,1) FROM flag_table)='f' THEN name ELSE price END"
    ],
    4: [
        "The upload accepts SVG files. XML parsers can be tricked into reading local files.",
        "Define an external entity that points to a local file, then reference it inside the SVG.",
        "The flag is stored in ../instance/flag.txt relative to the backend. Include that file.",
        "Upload the SVG and the response will leak the file content if the parser expands the entity."
    ]
}

@hints_bp.route('/hint/<int:stage>', methods=['GET'])
def get_hint(stage):
    # Store hint count in session (per user)
    hint_count = session.get(f'hint_{stage}', 0)
    session[f'hint_{stage}'] = hint_count + 1
    session.modified = True

    if stage not in HINTS:
        return jsonify({'error': 'Invalid stage'}), 400

    idx = min(hint_count, len(HINTS[stage]) - 1)
    return jsonify({'hint': HINTS[stage][idx]})
