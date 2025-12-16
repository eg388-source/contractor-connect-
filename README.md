# ContractorConnect CRM Lite (Full Working App)

## What this includes
- User registration/login (JWT auth)
- CRUD leads + notes
- Dashboard (pipeline totals + chart)
- Additional feature: Email + SMS notifications
  - Always logged to database
  - Optionally sent via SendGrid/Twilio if env vars are configured

## Run locally (Windows quick steps)

### 1) Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python app.py
```
Backend: http://127.0.0.1:5000/api/health

### 2) Frontend
Open a NEW terminal:
```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```
Frontend: http://localhost:5173

## Demo steps (for screenshots/video)
1) Register a user
2) Create a lead
3) Change lead stage to **Booked** and Save → notification auto-logs
4) Open Notifications tab → see email/SMS notification history
5) Dashboard shows chart + totals

## Deploy (recommended)
- Deploy backend on Render/Railway (Python friendly)
- Deploy frontend on Vercel

### Frontend Vercel env var
Set: `VITE_API_URL=https://<your-backend-url>`
