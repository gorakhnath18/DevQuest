import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Activity, Building2, Code2, LayoutDashboard, LogOut, Search, BriefcaseBusiness, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

const links = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/roadmap", label: "120-Day Roadmap", icon: Activity },
  { to: "/companies", label: "Companies", icon: Building2 },
  { to: "/applications", label: "Applications", icon: BriefcaseBusiness },
  { to: "/dsa", label: "DSA Library", icon: Code2 },
  { to: "/people", label: "Find Friends", icon: Search }
];
export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [invitations, setInvitations] = useState([]);
  const [invitationError, setInvitationError] = useState("");
  const signOut = () => { logout(); navigate("/login"); };
  useEffect(() => {
    let active = true;
    const loadInvitations = () => api.get("/profiles/invitations")
      .then(({ data }) => {
        if (active) {
          setInvitations(data);
          setInvitationError("");
        }
      })
      .catch(() => { if (active) setInvitationError("Could not check roadmap invitations."); });
    loadInvitations();
    const timer = window.setInterval(loadInvitations, 30000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);
  async function respondToInvite(invite, action) {
    setInvitationError("");
    try {
      await api.post(`/profiles/invitations/${invite.id}/${action}`);
      setInvitations(items => items.filter(item => item.id !== invite.id));
    } catch (e) {
      setInvitationError(e.response?.data?.message || "Could not respond to the invitation.");
    }
  }
  const pendingInvite = invitations[0];
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Code2 size={22}/></div><span>DEV<span className="accent">QUEST</span></span></div>
      <div className="side-label">WORKSPACE</div>
      <nav>{links.map(({to,label,icon:Icon}) => <NavLink key={to} to={to} end={to === "/"} className={({isActive}) => `nav-link ${isActive ? "active" : ""}`}><Icon size={18}/>{label}</NavLink>)}</nav>
      <div className="sidebar-bottom">
        <div className="user-mini"><div className="avatar">{user?.name?.[0]?.toUpperCase()}</div><div><strong>{user?.name}</strong><small>@{user?.username}</small></div></div>
        <button className="logout-button" onClick={signOut}><LogOut size={17}/> Sign out</button>
      </div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="breadcrumb">YOUR SDE JOURNEY <span>/</span> <b>COMMAND CENTER</b></div><div className="top-user"><span className="online-dot"/> Workspace active <div className="avatar small">{user?.name?.[0]?.toUpperCase()}</div><button className="topbar-logout" onClick={signOut}><LogOut size={14}/> Sign out</button></div></header>
      <div className="page-content"><Outlet/></div>
    </main>
    {invitationError && !pendingInvite && <div className="invitation-global-error" role="alert">{invitationError}<button onClick={() => setInvitationError("")}>Dismiss</button></div>}
    {pendingInvite && <div className="modal-backdrop" role="presentation"><section className="invite-dialog" role="dialog" aria-modal="true" aria-labelledby="invite-title"><div className="eyebrow"><Users size={14}/> ROADMAP INVITATION</div><h2 id="invite-title">{pendingInvite.sender.name} invited you to follow their roadmap</h2><p className="muted">Accepting lets you view their roadmap overview and progress. Your applications and personal progress stay private.</p>{invitationError && <div className="error-message">{invitationError}</div>}<div className="invite-dialog-actions"><button className="rb-secondary-button" onClick={() => respondToInvite(pendingInvite, "decline")}>Decline</button><button className="primary-button" onClick={() => respondToInvite(pendingInvite, "accept")}>Accept invitation</button></div></section></div>}
  </div>;
}
