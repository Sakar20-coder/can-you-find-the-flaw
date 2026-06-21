from flask import Blueprint, request, jsonify, session

hints_bp = Blueprint('hints', __name__)

HINTS = {
    1: [
        "The rate limiter uses X-Forwarded-For. Which IP does it trust?",
        "Try fetching the internal notes endpoint with a special header to get the pet name.",
        "Send X-Forwarded-For: 127.0.0.1, 1.1.1.1 then change the last IP each request to bypass the 3-attempt limit.",
        "The pet name is 'Fluffy'. Use it after bypassing the rate limit."
    ],
    2: [
        "The /flag endpoint reacts to a query parameter that starts with 'call'. Why would that exist?",
        "JSONP is a technique to bypass origin restrictions. An attacker can steal data by including a script tag.",
        "Create an HTML file that defines a function matching the callback name, then load the script.",
        "Extract the flag from the response and submit it via POST to /submit."
    ],
    3: [
        "The proxy respects X-Original-URL for rewriting requests. Does the cache key include this header?",
        "Try requesting /stage3/profile with X-Original-URL: /admin/flag – see what happens.",
        "The proxy caches the response under the *original* URL path. Poison the cache so everyone gets the flag.",
        "After poisoning, visit /stage3/profile normally – you'll get the flag from cache."
    ],
    4: [
        "The 'sort' parameter is injected directly into an SQL query. Can you influence the sort order?",
        "Use a CASE WHEN statement to create a boolean condition. Observe which product appears first.",
        "You need to extract a hidden value from another table (flag_table) character by character.",
        "Example: ?sort=CASE WHEN (SELECT substr(secret,1,1) FROM flag_table)='f' THEN name ELSE price END"
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