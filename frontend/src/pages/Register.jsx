import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../api.js";

export default function Register() {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  async function submit(e) {
    e.preventDefault();
    setErr(""); setOk("");
    try {
      await api.post("/api/auth/register", { name, email, password });
      setOk("Account created. Now log in.");
      setTimeout(()=>nav("/login"), 600);
    } catch (e) {
      setErr(e?.response?.data?.error || "Registration failed");
    }
  }

  return (
    <div className="container">
      <div className="row">
        <div className="col-6">
          <div className="card">
            <h2>Register</h2>
            <form onSubmit={submit}>
              <div className="small">Name</div>
              <input className="input" value={name} onChange={(e)=>setName(e.target.value)} placeholder="Elson" />
              <div style={{height:10}}/>
              <div className="small">Email</div>
              <input className="input" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@example.com" />
              <div style={{height:10}}/>
              <div className="small">Password</div>
              <input className="input" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="••••••••" />
              <div style={{height:14}}/>
              <button className="btn primary" type="submit">Create Account</button>
              {err && <div className="small" style={{marginTop:10, color:"#ffb3b3"}}>{err}</div>}
              {ok && <div className="small" style={{marginTop:10, color:"#b8ffcc"}}>{ok}</div>}
            </form>
            <div className="small" style={{marginTop:12}}>
              Already have an account? <Link to="/login">Login</Link>
            </div>
          </div>
        </div>
        <div className="col-6">
          <div className="card">
            <h3>Security</h3>
            <div className="small">
              Passwords are hashed on the backend and never stored in plain text.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
