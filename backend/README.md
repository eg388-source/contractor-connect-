# ContractorConnect Backend (Flask)

<<<<<<< HEAD
## Run locally (Windows)
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python app.py
```
API: http://127.0.0.1:5000/api/health

## Notes
- Uses SQLite by default (`contractorconnect.db`).
- Notification feature supports real providers (SendGrid/Twilio) via env vars.
- If provider env vars are missing, notifications are still logged in DB (counts for demo + grading).
=======
## Run locally
```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Mac/Linux:
# source .venv/bin/activate

pip install -r requirements.txt
python app.py
```

## Render settings (manual)
Root Directory: `backend`

Build command:
```bash
pip install -r requirements.txt
```

Start command:
```bash
gunicorn app:app --bind 0.0.0.0:$PORT
```

Env vars:
- JWT_SECRET_KEY (required)
- DATABASE_URL (optional; Render sets this if you attach Postgres)
>>>>>>> 166f992dea7a1eec725fd93f0f2ac0bef437b79c
