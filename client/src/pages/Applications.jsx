import { useEffect, useState } from "react";
import { BriefcaseBusiness, ExternalLink, Trash2 } from "lucide-react";
import api from "../services/api";
import CompanyEligibilityCard from "../components/CompanyEligibilityCard";
import "./applications.css";

const statuses = ["Interested", "Applied", "Assessment", "Interview", "Selected", "Offer", "Accepted", "Rejected", "Withdrawn"];

export default function Applications() {
  const [data, setData] = useState({ items: [], counts: {} });
  const [filter, setFilter] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const { data: result } = await api.get("/applications");
      setData(result);
      setError("");
    } catch (e) {
      setError(e.response?.data?.message || "Unable to load applications.");
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function updateStatus(application, status) {
    try {
      if (status === "Remove") {
        await api.delete(`/applications/${application.company._id}`);
      } else {
        await api.patch(`/applications/${application.company._id}`, { status, role: application.role, jobUrl: application.jobUrl });
      }
      await load();
    } catch (e) { setError(e.response?.data?.message || "Could not update application."); }
  }

  async function updateNotes(application, privateNotes) {
    try {
      await api.patch(`/applications/${application.company._id}`, {
        status: application.status, role: application.role, jobUrl: application.jobUrl, privateNotes
      });
    } catch (e) { setError(e.response?.data?.message || "Could not save your private notes."); }
  }

  const visible = data.items.filter(item => !filter || item.status === filter);
  const counts = data.counts;

  return <section className="applications-page">
    <div className="page-title-row"><div><div className="eyebrow">YOUR JOB SEARCH</div><h1>Applications</h1><p className="muted">Track application status, interviews, offers, and private notes.</p></div></div>
    <CompanyEligibilityCard/>
    {error && <div className="error-message">{error}</div>}
    <div className="application-stats">
      <div><b>{counts.total || 0}</b><span>TRACKED</span></div>
      <div><b>{counts.applied || 0}</b><span>APPLIED / IN PROCESS</span></div>
      <div><b>{counts.interviews || 0}</b><span>INTERVIEWS</span></div>
      <div><b>{counts.offers || 0}</b><span>OFFERS</span></div>
      <div><b>{counts.accepted || 0}</b><span>ACCEPTED</span></div>
      <div><b>{counts.rejected || 0}</b><span>REJECTED</span></div>
    </div>
    <div className="application-toolbar">
      <label>Filter status<select value={filter} onChange={event => setFilter(event.target.value)}><option value="">All statuses</option>{statuses.map(status => <option key={status}>{status}</option>)}</select></label>
      <span>{visible.length} record{visible.length === 1 ? "" : "s"}</span>
    </div>
    {loading ? <div className="loading-screen">Loading applications…</div> : visible.length === 0
      ? <div className="panel application-empty"><BriefcaseBusiness size={26}/><h2>No applications tracked yet</h2><p className="muted">Use the application status selector in the Company Directory to start tracking employers.</p></div>
      : <div className="application-list">{visible.map(application => <article className="application-card" key={application._id}>
        <div className="application-main">
          <div className="application-company-mark"><BriefcaseBusiness size={18}/></div>
          <div className="application-company"><h2>{application.company.name}</h2><p>{application.company.industry} · {application.role}</p></div>
          <select aria-label={`${application.company.name} status`} value={application.status} onChange={event => updateStatus(application, event.target.value)}>
            {statuses.map(status => <option key={status}>{status}</option>)}
            <option value="Remove">Remove tracking</option>
          </select>
          {application.jobUrl && <a className="application-job-link" href={application.jobUrl} target="_blank" rel="noreferrer">Job link <ExternalLink size={13}/></a>}
        </div>
        <div className="application-meta">
          <span>Tracked {new Date(application.updatedAt).toLocaleDateString()}</span>
          {application.appliedAt && <span>Applied {new Date(application.appliedAt).toLocaleDateString()}</span>}
          {application.interviewAt && <span>Interview {new Date(application.interviewAt).toLocaleDateString()}</span>}
          <a href={application.company.careersPage} target="_blank" rel="noreferrer">Careers page <ExternalLink size={12}/></a>
        </div>
        <label className="application-notes">Private notes<textarea rows="2" defaultValue={application.privateNotes || ""} placeholder="Referral, follow-up, interview notes…" onBlur={event => {
          if (event.target.value !== (application.privateNotes || "")) updateNotes(application, event.target.value);
        }}/></label>
        <button className="application-remove" onClick={() => updateStatus(application, "Remove")} aria-label={`Remove ${application.company.name} application tracking`}><Trash2 size={14}/> Remove</button>
      </article>)}</div>}
  </section>;
}
