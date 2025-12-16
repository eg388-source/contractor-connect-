# ContractorConnect (Clean Starter)

This is a clean "square one" repo that deploys correctly.

Backend on Render:
- Root Directory: backend
- Build: pip install -r requirements.txt
- Start: gunicorn app:app --bind 0.0.0.0:$PORT
- Env var: JWT_SECRET_KEY = any random string

Test it:
- https://<service>.onrender.com/health  -> OK
