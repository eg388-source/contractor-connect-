import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(()=>{
    (async ()=>{
      try {
        const res = await api.get("/api/dashboard");
        setData(res.data);
      } catch (e) {
        setErr(e?.response?.data?.error || "Failed to load dashboard");
      }
    })();
  }, []);

  const labels = data ? Object.keys(data.by_stage) : [];
  const counts = data ? Object.values(data.by_stage) : [];

  return (
    <div className="container">
      <h1>Dashboard</h1>
      {err && <div className="small" style={{color:"#ffb3b3"}}>{err}</div>}

      {data && (
        <div className="row">
          <div className="col-4">
            <div className="card">
              <div className="small">Total leads</div>
              <h2>{data.total_leads}</h2>
            </div>
          </div>
          <div className="col-4">
            <div className="card">
              <div className="small">Pipeline value</div>
              <h2>${Math.round(data.pipeline_value).toLocaleString()}</h2>
            </div>
          </div>
          <div className="col-4">
            <div className="card">
              <div className="small">Upcoming appointments</div>
              <h2>{data.upcoming.length}</h2>
            </div>
          </div>

          <div className="col-8">
            <div className="card">
              <h3>Leads by stage</h3>
              <Bar
                data={{
                  labels,
                  datasets: [{ label: "Leads", data: counts }],
                }}
                options={{ responsive: true, plugins: { legend: { display: true } } }}
              />
            </div>
          </div>

          <div className="col-4">
            <div className="card">
              <h3>Next appointments</h3>
              <div className="small">Showing up to 10</div>
              <div style={{height:10}}/>
              {data.upcoming.length === 0 ? (
                <div className="small">No appointments yet.</div>
              ) : (
                <div>
                  {data.upcoming.map((l)=>(
                    <div key={l.id} style={{padding:"10px 0", borderBottom:"1px solid rgba(255,255,255,0.10)"}}>
                      <div style={{fontWeight:700}}>{l.full_name}</div>
                      <div className="small">{l.appointment_datetime}</div>
                      <div className="small"><span className="pill">{l.stage}</span></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
