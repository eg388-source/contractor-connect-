import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api, setToken, setUser } from "../api.js";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  async function submit(e) {
    e.preventDefault();
    setErr("");
    try {
      const res = await api.post("/api/auth/login", { email, password });
      setToken(res.data.access_token);
      setUser(res.data.user);
      nav("/dashboard");
    } catch (e) {
      setErr(e?.response?.data?.error || "Login failed");
    }
  }

  return (
    <div className="container">
      <div className="row">
        <div className="col-6">
          <div className="card">
            <h2>Login</h2>
            <form onSubmit={submit}>
              <div className="small">Email</div>
              <input className="input" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@example.com" />
              <div style={{height:10}}/>
              <div className="small">Password</div>
              <input className="input" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="••••••••" />
              <div style={{height:14}}/>
              <button className="btn primary" type="submit">Sign In</button>
              {err && <div className="small" style={{marginTop:10, color:"#ffb3b3"}}>{err}</div>}
            </form>
            <div className="small" style={{marginTop:12}}>
              No account? <Link to="/register">Register</Link>
            </div>
          </div>
        </div>
        <div className="col-6">
          <div className="card">
            <h3>What this app does</h3>
            <ul className="small">
              <li>Secure login + user-only data</li>
              <li>Track leads/jobs with stages</li>
              <li>Dashboard charts + pipeline totals</li>
              <li>Extra feature: Email + SMS notifications (logged and optionally sent)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
