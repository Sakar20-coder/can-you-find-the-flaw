from flask import Blueprint, request, jsonify, session

hints_bp = Blueprint('hints', __name__)

HINTS = {
    1: [
        "The application remembers who is making requests.",
        "Check every endpoint, not just the obvious ones.",
        "Some request metadata may be more important than it looks.",
        "You need information from one place to solve another."
    ],

    2: [
        "The response changes when a specific query parameter is present.",
        "Pay attention to the content type being returned.",
        "The endpoint returns more than just data.",
        "Think about how browsers handle external JavaScript."
    ],

    3: [
        "A single request can affect a later request.",
        "Look closely at headers related to routing or rewriting.",
        "Not all request information is treated equally by every layer.",
        "The interesting behavior is not visible on the first request."
    ],

    4: [
        "The database query is influenced by user input.",
        "Try inputs that change the structure of the query, not just its value.",
        "Unexpected rows can be just as useful as expected ones.",
        "The application may reveal more than the products table."
    ]
}

@hints_bp.route('/hint/<int:stage>', methods=['GET'])
def get_hint(stage):
    hint_count = session.get(f'hint_{stage}', 0)
    session[f'hint_{stage}'] = hint_count + 1
    session.modified = True

    if stage not in HINTS:
        return jsonify({'error': 'Invalid stage'}), 400

    idx = min(hint_count, len(HINTS[stage]) - 1)
    return jsonify({'hint': HINTS[stage][idx]})