import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import { Link } from "react-router-dom";

const STAGES = ["New","Contacted","Booked","Estimate Sent","Closed Won","Closed Lost"];

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [stage, setStage] = useState("");
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");

  // create form
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
    stage: "New",
    estimated_value: 0,
    appointment_datetime: ""
  });

  async function load() {
    setErr("");
    try {
      const res = await api.get("/api/leads", { params: stage ? { stage } : {} });
      setLeads(res.data);
    } catch (e) {
      setErr(e?.response?.data?.error || "Failed to load leads");
    }
  }

  useEffect(()=>{ load(); }, [stage]);

  const filtered = leads.filter(l =>
    (l.full_name || "").toLowerCase().includes(q.toLowerCase()) ||
    (l.phone || "").toLowerCase().includes(q.toLowerCase()) ||
    (l.email || "").toLowerCase().includes(q.toLowerCase())
  );

  async function createLead(e) {
    e.preventDefault();
    setErr("");
    try {
      await api.post("/api/leads", form);
      setForm({ full_name:"", phone:"", email:"", address:"", city:"", state:"", stage:"New", estimated_value:0, appointment_datetime:"" });
      await load();
    } catch (e) {
      setErr(e?.response?.data?.error || "Failed to create lead");
    }
  }

  async function delLead(id) {
    if (!confirm("Delete this lead?")) return;
    setErr("");
    try {
      await api.delete(`/api/leads/${id}`);
      await load();
    } catch (e) {
      setErr(e?.response?.data?.error || "Failed to delete lead");
    }
  }

  return (
    <div className="container">
      <h1>Leads</h1>
      {err && <div className="small" style={{color:"#ffb3b3"}}>{err}</div>}

      <div className="row">
        <div className="col-4">
          <div className="card">
            <h3>New lead</h3>
            <form onSubmit={createLead}>
              <label>Full name</label>
              <input className="input" value={form.full_name} onChange={(e)=>setForm({...form, full_name:e.target.value})} />
              <div style={{height:10}}/>
              <label>Phone</label>
              <input className="input" value={form.phone} onChange={(e)=>setForm({...form, phone:e.target.value})} />
              <div style={{height:10}}/>
              <label>Email</label>
              <input className="input" value={form.email} onChange={(e)=>setForm({...form, email:e.target.value})} />
              <div style={{height:10}}/>
              <label>Stage</label>
              <select className="input" value={form.stage} onChange={(e)=>setForm({...form, stage:e.target.value})}>
                {STAGES.map(s=>(<option key={s} value={s}>{s}</option>))}
              </select>
              <div style={{height:10}}/>
              <label>Estimated value ($)</label>
              <input className="input" type="number" value={form.estimated_value} onChange={(e)=>setForm({...form, estimated_value:e.target.value})} />
              <div style={{height:10}}/>
              <label>Appointment datetime (optional)</label>
              <input className="input" value={form.appointment_datetime} onChange={(e)=>setForm({...form, appointment_datetime:e.target.value})} placeholder="2025-12-16 14:00" />
              <div style={{height:14}}/>
              <button className="btn primary" type="submit">Create</button>
            </form>
          </div>
        </div>

        <div className="col-8">
          <div className="card">
            <div className="flex" style={{justifyContent:"space-between"}}>
              <div className="flex">
                <input className="input" style={{maxWidth:300}} value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search name/phone/email..." />
                <select className="input" style={{maxWidth:220}} value={stage} onChange={(e)=>setStage(e.target.value)}>
                  <option value="">All stages</option>
                  {STAGES.map(s=>(<option key={s} value={s}>{s}</option>))}
                </select>
              </div>
              <button className="btn" onClick={load}>Refresh</button>
            </div>

            <div style={{height:12}}/>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Stage</th>
                  <th>Value</th>
                  <th>Appointment</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(l => (
                  <tr key={l.id}>
                    <td>{l.full_name}</td>
                    <td><span className="pill">{l.stage}</span></td>
                    <td>${Math.round(l.estimated_value||0).toLocaleString()}</td>
                    <td className="small">{l.appointment_datetime || "-"}</td>
                    <td>
                      <div className="flex">
                        <Link className="btn" to={`/leads/${l.id}`}>View/Edit</Link>
                        <button className="btn danger" onClick={()=>delLead(l.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan="5" className="small">No leads found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
