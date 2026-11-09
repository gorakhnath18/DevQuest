import { useEffect, useState } from "react";
import { ArrowRight, BriefcaseBusiness, Target } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../services/api";

export default function CompanyEligibilityCard() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get("/roadmap"),
      api.get("/companies", { params: { limit: 1 } })
    ]).then(([roadmapResponse, companyResponse]) => {
      if (!active) return;
      const days = roadmapResponse.data;
      const totalTasks = days.reduce((sum, day) => sum + day.tasks.length, 0);
      const completedTasks = days.reduce((sum, day) => sum + day.progress.completedTasks.length, 0);
      setSummary({
        progress: totalTasks ? Math.round(completedTasks / totalTasks * 100) : 0,
        companyCount: companyResponse.data.total
      });
    }).catch(e => {
      if (active) setError(e.response?.data?.message || "Could not load company readiness information.");
    });
    return () => { active = false; };
  }, []);

  return <section className="panel eligibility-card">
    <div className="panel-head"><div><span className="eyebrow">APPLICATION READINESS</span><h3>Company eligibility</h3></div><BriefcaseBusiness size={20}/></div>
    {error ? <div className="error-message" role="alert">{error}</div> : !summary
      ? <p className="muted">Checking roadmap progress and company data…</p>
      : <>
        <div className="eligibility-metrics">
          <div><Target size={17}/><span>120-day roadmap progress</span><strong>{summary.progress}% <small>{summary.progress >= 70 ? "readiness marker reached" : `/ 70% readiness marker`}</small></strong></div>
          <div><BriefcaseBusiness size={17}/><span>Companies with verified requirements</span><strong>0 <small>of {summary.companyCount} assessed</small></strong></div>
        </div>
        <p className="muted">{summary.companyCount} companies need verified role and hiring requirements before eligibility can be assessed. Roadmap progress is a readiness signal, not proof of employer eligibility.</p>
        <Link className="text-link" to="/companies">Review company directory <ArrowRight size={15}/></Link>
      </>}
  </section>;
}
