from flask import Blueprint, request, jsonify, session

hints_bp = Blueprint('hints', __name__)

HINTS = {
    1: [
        "The rate limiter uses your IP address to track attempts. Can you make it see a different IP each time without actually changing your network?",
        "There's an internal endpoint that might tell you the admin's secret answer. Try requesting it with a header that suggests you're an admin.",
        "The server trusts the last IP in the X-Forwarded-For header. Sending multiple IPs lets you cycle through them to avoid the limit.",
        "The hidden endpoint returns a pet name. That name is the answer you need for the password reset question."
    ],
    2: [
        "The /flag endpoint behaves differently when you add a query parameter that looks like a function name. What could that be for?",
        "That parameter triggers a JSONP response – a way to fetch data across origins. The response is a JavaScript function call containing the flag.",
        "You can create a simple HTML page that loads this script and defines a global function to catch the flag.",
        "Once you have the flag, submit it to the /submit endpoint to complete the stage."
    ],
    3: [
        "The server uses a proxy that can rewrite the request path based on a header. But the cache key might not include that header.",
        "Try adding a header like X-Original-URL when requesting the profile page. What happens if you point it to a different path?",
        "The proxy caches the response under the original URL, not the rewritten one. The first request stores data, the second retrieves it.",
        "Request the profile with the rewrite header set to the flag endpoint, then request the profile normally – the flag will be served from cache."
    ],
    4: [
        "The 'id' parameter is inserted directly into an SQL query. Can you break the query to add your own logic?",
        "A UNION SELECT lets you combine results from another table. You need to match the number of columns – start with 3.",
        "First, list all tables in the database using sqlite_master. Look for a table that might hold a secret.",
        "Once you find the table and its column, extract the flag with a UNION SELECT and submit it."
    ]
}
