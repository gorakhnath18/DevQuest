import { useEffect, useState } from "react";
import { Building2, ChevronLeft, ChevronRight, ExternalLink, Search } from "lucide-react";
import api from "../services/api";
import CompanyEligibilityCard from "../components/CompanyEligibilityCard";
import "./companies.css";

const pageSize = 50;

export default function Companies() {
  const [companies, setCompanies] = useState([]);
  const [applications, setApplications] = useState([]);
  const [applicationCounts, setApplicationCounts] = useState({ applied: 0 });
  const [industries, setIndustries] = useState([]);
  const [industry, setIndustry] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let current = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const [companyResponse, applicationResponse] = await Promise.all([
          api.get("/companies", { params: { q: query, industry, page, limit: pageSize } }),
          api.get("/applications")
        ]);
        if (current) {
          setCompanies(companyResponse.data.items);
          setIndustries(companyResponse.data.industries);
          setTotal(companyResponse.data.total);
          setApplications(applicationResponse.data.items);
          setApplicationCounts(applicationResponse.data.counts);
        }
      } catch (e) {
        if (current) setError(e.response?.data?.message || "Unable to load company directory.");
      } finally {
        if (current) setLoading(false);
      }
    }, 180);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [industry, query, page]);

  async function setApplicationStatus(company, status) {
    try {
      if (status === "Not Applied") {
        await api.delete(`/applications/${company._id}`);
      } else {
        await api.patch(`/applications/${company._id}`, { status });
      }
      const { data } = await api.get("/applications");
      setApplications(data.items);
      setApplicationCounts(data.counts);
      setError("");
    } catch (e) {
      setError(e.response?.data?.message || "Could not update application status.");
    }
  }

  return <section className="company-page">
    <div className="page-title-row">
      <div><div className="eyebrow">EXPLORE EMPLOYERS</div><h1>Company Directory</h1><p className="muted">600+ remote-friendly technology employers with company and careers links.</p></div>
    </div>
    <CompanyEligibilityCard/>
    <div className="company-toolbar">
      <div className="search-box"><Search size={16}/><input aria-label="Search companies" placeholder="Search companies or industries…" value={query} onChange={event => { setQuery(event.target.value); setPage(1); }}/></div>
      <select aria-label="Filter by industry" value={industry} onChange={event => { setIndustry(event.target.value); setPage(1); }}>
        <option value="">All industries</option>
        {industries.map(item => <option key={item} value={item}>{item}</option>)}
      </select>
    </div>
    {error && <div className="error-message">{error}</div>}
    {loading && <div className="loading-screen">Loading company directory…</div>}
    {!loading && !error && <>
      <div className="company-summary"><Building2 size={16}/><span>Showing {total ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, total)} of {total} listed companies · {applicationCounts.applied} tracked applications</span></div>
      <div className="company-table-wrap"><table className="company-table">
        <thead><tr><th>COMPANY</th><th>INDUSTRY</th><th>COMPENSATION</th><th>APPLICATION</th><th>OFFICIAL LINKS</th></tr></thead>
        <tbody>{companies.map(company => <tr key={company._id}>
          <td><div className="company-name-cell"><span className="company-mark"><Building2 size={17}/></span><b>{company.name}</b></div></td>
          <td><span className="company-industry">{company.industry}</span></td>
          <td><span className="company-unknown-pay">Not verified</span></td>
          <td><select className="company-application-select" aria-label={`${company.name} application status`} value={applications.find(item => item.company?._id === company._id)?.status || "Not Applied"} onChange={event => setApplicationStatus(company, event.target.value)}>
            {["Not Applied", "Interested", "Applied", "Assessment", "Interview", "Selected", "Offer", "Accepted", "Rejected", "Withdrawn"].map(status => <option key={status}>{status}</option>)}
          </select></td>
          <td><div className="company-links"><a href={company.website} target="_blank" rel="noreferrer">Website <ExternalLink size={12}/></a><a href={company.careersPage} target="_blank" rel="noreferrer">Careers <ExternalLink size={12}/></a></div></td>
        </tr>)}</tbody>
      </table></div>
      {companies.length === 0 && <div className="empty-state">No companies match that search.</div>}
      <div className="company-pagination">
        <button className="rb-secondary-button" disabled={page <= 1} onClick={() => setPage(current => current - 1)}><ChevronLeft size={15}/> Previous</button>
        <span>Page {page} of {Math.max(1, Math.ceil(total / pageSize))}</span>
        <button className="rb-secondary-button" disabled={page >= Math.ceil(total / pageSize)} onClick={() => setPage(current => current + 1)}>Next <ChevronRight size={15}/></button>
      </div>
      <p className="company-disclaimer">Compensation is marked “Not verified” where no reliable, dated salary source is available. Directory additions use the community-maintained <a href="https://github.com/remoteintech/remote-jobs" target="_blank" rel="noreferrer">Remote In Tech directory</a>; hiring status and salary are not guaranteed.</p>
    </>}
  </section>;
}
