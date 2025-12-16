import React, { useEffect, useState } from "react";
import { api } from "../api.js";

export default function Notifications() {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    try {
      const res = await api.get("/api/notifications");
      setItems(res.data);
    } catch (e) {
      setErr(e?.response?.data?.error || "Failed to load notifications");
    }
  }

  useEffect(()=>{ load(); }, []);

  return (
    <div className="container">
      <div className="flex" style={{justifyContent:"space-between"}}>
        <h1>Notifications</h1>
        <button className="btn" onClick={load}>Refresh</button>
      </div>
      {err && <div className="small" style={{color:"#ffb3b3"}}>{err}</div>}
      <div className="card">
        {items.length === 0 ? (
          <div className="small">No notifications yet. Create a lead and move it to Booked, or send one from Lead Detail.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>When</th>
                <th>Channel</th>
                <th>To</th>
                <th>Status</th>
                <th>Subject</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              {items.map(n => (
                <tr key={n.id}>
                  <td className="small">{n.created_at}</td>
                  <td><span className="pill">{n.channel}</span></td>
                  <td className="small">{n.to_value}</td>
                  <td><span className="pill">{n.status}</span></td>
                  <td className="small">{n.subject || "-"}</td>
                  <td className="small">{n.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
