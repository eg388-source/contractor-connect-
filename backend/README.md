# ContractorConnect Backend (Flask)

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
