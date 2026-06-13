# Can You Find the Flaw? – Web Security CTF

Four‑stage web challenge that teaches real‑world vulnerabilities:  
- JWT algorithm confusion (`alg: none`)  
- JSONP data leakage  
- Blind SQL injection via `ORDER BY`  
- XXE via SVG upload

Only players with solid web security skills will get all flags.

---

## 🚀 Setup (for hosting the game)

1. **Clone the repository**  
   ```bash
   git clone https://github.com/YOUR_USERNAME/can-you-find-the-flaw.git
   cd can-you-find-the-flaw
Create a virtual environment (Python 3.8+)

bash
python3 -m venv venv
source venv/bin/activate   # On Windows: venv\Scripts\activate
Install dependencies

bash
pip install -r requirements.txt
Run the application

bash
python app.py
Open your browser at http://localhost:5000

The game is now ready. Each stage unlocks after solving the previous one.

🎯 Hints for players (optional)
Stage 1: Look at the JWT token. What does the alg field say? Can you modify it?

Stage 2: The /api/stage2/flag endpoint accepts a callback. Why?

Stage 3: The sort parameter is injected into an SQL query. Use blind boolean techniques.

Stage 4: Upload an SVG. The parser is vulnerable to XXE. Read ../instance/flag.txt.

📁 Project structure
text
.
├── app.py
├── config.py
├── database.py
├── requirements.txt
├── routes/
│   ├── stage1.py (JWT none)
│   ├── stage2.py (JSONP)
│   ├── stage3.py (blind SQLi)
│   ├── stage4.py (XXE)
│   ├── hints.py
│   └── prize.py
├── static/
│   ├── css/style.css
│   └── js/main.js
└── templates/index.html
🔒 Security note
This app contains deliberate vulnerabilities. Do not deploy it on a public server without proper isolation (e.g., inside a CTF framework with network restrictions).

🏆 Prize claim
After solving all four stages, click Claim Prize to get a token. Show it to the event organiser.

📝 License
MIT – use for educational purposes only.
