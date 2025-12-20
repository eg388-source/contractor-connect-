import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import { useParams, useNavigate } from "react-router-dom";

const STAGES = ["New","Contacted","Booked","Estimate Sent","Closed Won","Closed Lost"];

export default function LeadDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [lead, setLead] = useState(null);
  const [notes, setNotes] = useState([]);
  const [err, setErr] = useState("");
  const [noteText, setNoteText] = useState("");

  async function load() {
    setErr("");
    try {
      const res = await api.get(`/api/leads/${id}`);
      setLead(res.data);
      setNotes(res.data.notes || []);
    } catch (e) {
      setErr(e?.response?.data?.error || "Failed to load lead");
    }
  }

  useEffect(()=>{ load(); }, [id]);

  async function save() {
    setErr("");
    try {
      await api.put(`/api/leads/${id}`, lead);
      await load();
      alert("Saved. If you changed stage to Booked, a notification will be logged/sent.");
    } catch (e) {
      setErr(e?.response?.data?.error || "Failed to save");
    }
  }

  async function addNote(e) {
    e.preventDefault();
    setErr("");
    try {
      await api.post(`/api/leads/${id}/notes`, { note_text: noteText });
      setNoteText("");
      await load();
    } catch (e) {
      setErr(e?.response?.data?.error || "Failed to add note");
    }
  }

  async function sendQuick(channel) {
    // Uses lead email/phone automatically
    if (!lead) return;
    const to_value = channel === "email" ? (lead.email || "") : (lead.phone || "");
    if (!to_value) {
      alert(`No ${channel} on file for this lead.`);
      return;
    }
    const message = channel === "email"
      ? `Hi ${lead.full_name}, just a reminder about your appointment. Reply if you need to reschedule.`
      : `Reminder: appointment coming up. Reply if you need to reschedule.`;

    try {
      await api.post("/api/notifications/send", {
        channel,
        to_value,
        subject: "Appointment reminder",
        message,
        lead_id: lead.id
      });
      alert("Notification sent/logged. Check Notifications tab.");
    } catch (e) {
      alert(e?.response?.data?.error || "Failed to send notification");
    }
  }

  if (!lead) {
    return (
      <div className="container">
        <h1>Lead</h1>
        {err ? <div className="small" style={{color:"#ffb3b3"}}>{err}</div> : <div className="small">Loading…</div>}
      </div>
    );
  }

  return (
    <div className="container">
      <div className="flex" style={{justifyContent:"space-between"}}>
        <h1>Lead Detail</h1>
        <button className="btn" onClick={()=>nav("/leads")}>Back</button>
      </div>
      {err && <div className="small" style={{color:"#ffb3b3"}}>{err}</div>}

      <div className="row">
        <div className="col-6">
          <div className="card">
            <h3>Info</h3>
            <label>Full name</label>
            <input className="input" value={lead.full_name || ""} onChange={(e)=>setLead({...lead, full_name:e.target.value})} />
            <div style={{height:10}}/>
            <label>Phone</label>
            <input className="input" value={lead.phone || ""} onChange={(e)=>setLead({...lead, phone:e.target.value})} />
            <div style={{height:10}}/>
            <label>Email</label>
            <input className="input" value={lead.email || ""} onChange={(e)=>setLead({...lead, email:e.target.value})} />
            <div style={{height:10}}/>
            <label>Stage</label>
            <select className="input" value={lead.stage} onChange={(e)=>setLead({...lead, stage:e.target.value})}>
              {STAGES.map(s=>(<option key={s} value={s}>{s}</option>))}
            </select>
            <div style={{height:10}}/>
            <label>Estimated value ($)</label>
            <input className="input" type="number" value={lead.estimated_value || 0} onChange={(e)=>setLead({...lead, estimated_value:e.target.value})} />
            <div style={{height:10}}/>
            <label>Appointment datetime</label>
            <input className="input" value={lead.appointment_datetime || ""} onChange={(e)=>setLead({...lead, appointment_datetime:e.target.value})} placeholder="2025-12-16 14:00" />
            <div style={{height:14}}/>
            <div className="flex">
              <button className="btn primary" onClick={save}>Save</button>
              <button className="btn" onClick={()=>sendQuick("email")}>Send Email</button>
              <button className="btn" onClick={()=>sendQuick("sms")}>Send SMS</button>
            </div>
            <div className="small" style={{marginTop:10}}>
              Tip: change stage to <b>Booked</b> and hit Save — it will auto-create a notification.
            </div>
          </div>
        </div>

        <div className="col-6">
          <div className="card">
            <h3>Notes</h3>
            <form onSubmit={addNote}>
              <textarea className="input" rows="3" value={noteText} onChange={(e)=>setNoteText(e.target.value)} placeholder="Add a note..." />
              <div style={{height:10}}/>
              <button className="btn primary" type="submit">Add Note</button>
            </form>
            <div style={{height:14}}/>
            {notes.length === 0 ? (
              <div className="small">No notes yet.</div>
            ) : (
              notes.map(n => (
                <div key={n.id} style={{padding:"10px 0", borderBottom:"1px solid rgba(255,255,255,0.10)"}}>
                  <div>{n.note_text}</div>
                  <div className="small">{n.created_at}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
