import React from "react";
import { Routes, Route, Navigate, Link, useNavigate } from "react-router-dom";
import { clearToken, getToken, getUser } from "./api.js";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Leads from "./pages/Leads.jsx";
import LeadDetail from "./pages/LeadDetail.jsx";
import Notifications from "./pages/Notifications.jsx";

function Topbar() {
  const nav = useNavigate();
  const token = getToken();
  const user = getUser();

  return (
    <div className="topbar">
      <div className="topbar-inner">
        <div className="flex">
          <div className="brand">ContractorConnect</div>
          {token && (
            <div className="small">Signed in as {user?.name || "User"}</div>
          )}
        </div>
        <div className="flex">
          {token ? (
            <>
              <Link className="btn" to="/dashboard">Dashboard</Link>
              <Link className="btn" to="/leads">Leads</Link>
              <Link className="btn" to="/notifications">Notifications</Link>
              <button className="btn danger" onClick={() => { clearToken(); nav("/login"); }}>Logout</button>
            </>
          ) : (
            <>
              <Link className="btn" to="/login">Login</Link>
              <Link className="btn primary" to="/register">Register</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Protected({ children }) {
  const token = getToken();
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <>
      <Topbar />
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
        <Route path="/leads" element={<Protected><Leads /></Protected>} />
        <Route path="/leads/:id" element={<Protected><LeadDetail /></Protected>} />
        <Route path="/notifications" element={<Protected><Notifications /></Protected>} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  );
}
