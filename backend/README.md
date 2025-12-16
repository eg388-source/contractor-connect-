# ContractorConnect Backend (Flask)

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
