import { useState } from "react";
import { ArrowUpRight, Search, Trophy, Target, Code2, Link2, Copy, X } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../services/api";
import "./people.css";

export default function People() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [inviteLinks, setInviteLinks] = useState({});
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  async function search(e) {
    e.preventDefault(); setError(""); setSearched(true);
    if (query.trim().length < 2) { setResults([]); return; }
    try { const { data } = await api.get(`/profiles/search?q=${encodeURIComponent(query.trim())}`); setResults(data); }
    catch (e) { setError(e.response?.data?.message || "Search failed."); }
  }
  async function inviteToRoadmap() {
    if (!selectedPerson) return;
    setSending(true);
    setError("");
    try {
      const { data } = await api.post(`/profiles/${selectedPerson._id}/invitations`);
      setInviteLinks(current => ({ ...current, [selectedPerson._id]: data.inviteLink }));
    } catch (e) {
      setError(e.response?.data?.message || "Could not send this roadmap invitation.");
    } finally {
      setSending(false);
    }
  }
  async function copyInviteLink() {
    const link = inviteLinks[selectedPerson?._id];
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setError("Copy was blocked by the browser. Select and copy the invitation link below.");
    }
  }
  return <>
    <div className="page-title-row"><div><div className="eyebrow">SQUAD DISCOVERY</div><h1>Find your people</h1><p className="muted">Look up public DEVQUEST profiles by username.</p></div></div>
    <form className="people-search panel" onSubmit={search}><div className="search-box"><Search size={19}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search username… e.g. aditya_dev" minLength="2"/></div><button className="primary-button">Search profiles <ArrowUpRight size={16}/></button></form>
    {error && <div className="error-message">{error}</div>}
    <div className="people-results">{results.map(person=><article className="person-card" key={person._id}><div className="person-top"><div className="avatar person-avatar">{person.name[0].toUpperCase()}</div><Link aria-label={`View ${person.name}'s profile`} to={`/profile/${person.username}`}><ArrowUpRight size={17}/></Link></div><Link className="person-name-link" to={`/profile/${person.username}`}><h3>{person.name}</h3></Link><p>@{person.username}</p><div className="person-stats"><span><Trophy size={15}/>{person.stats.xp} XP</span><span><Target size={15}/>{person.stats.completionPercent}%</span><span><Code2 size={15}/>{person.stats.dsaSolved} solved</span></div><div className="person-progress"><span style={{width:`${person.stats.completionPercent}%`}}/></div><button className="people-invite-button" onClick={() => { setSelectedPerson(person); setCopied(false); }}><Link2 size={14}/>{inviteLinks[person._id] ? "Invitation ready" : "Invite to roadmap"}</button></article>)}</div>
    {searched && results.length===0 && !error && <div className="empty-state">No public profiles found. Check the username and try again.</div>}
    {selectedPerson && <div className="modal-backdrop" role="presentation"><section className="invite-dialog" role="dialog" aria-modal="true" aria-labelledby="people-invite-title"><button className="modal-close" aria-label="Close" onClick={() => { setSelectedPerson(null); setError(""); }}><X size={17}/></button><div className="eyebrow">SHARE YOUR ROADMAP</div><h2 id="people-invite-title">{inviteLinks[selectedPerson._id] ? `Invitation ready for ${selectedPerson.name}` : `Invite ${selectedPerson.name}?`}</h2><p className="muted">They can accept in DEVQUEST to view your roadmap overview and progress. Your applications remain private.</p>{error && <div className="error-message">{error}</div>}{inviteLinks[selectedPerson._id] ? <><label className="invite-link-field">Invitation link<input readOnly value={inviteLinks[selectedPerson._id]} onFocus={event => event.target.select()}/></label><div className="invite-dialog-actions"><button className="rb-secondary-button" onClick={copyInviteLink}><Copy size={14}/>{copied ? "Copied" : "Copy invite link"}</button><button className="primary-button" onClick={() => setSelectedPerson(null)}>Done</button></div></> : <div className="invite-dialog-actions"><button className="rb-secondary-button" onClick={() => setSelectedPerson(null)}>Cancel</button><button className="primary-button" disabled={sending} onClick={inviteToRoadmap}>{sending ? "Sending…" : "Send invitation"} <ArrowUpRight size={16}/></button></div>}</section></div>}
  </>;
}
