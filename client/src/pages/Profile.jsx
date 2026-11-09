import { useEffect, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Code2, Target, Trophy } from "lucide-react";
import api from "../services/api";

export default function Profile() {
  const { username } = useParams();
  const [searchParams] = useSearchParams();
  const isSharedView = searchParams.get("shared") === "1";
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    setProfile(null);
    setError("");
    const endpoint = isSharedView ? `/profiles/${username}/shared-overview` : `/profiles/${username}`;
    api.get(endpoint).then(r => setProfile(r.data)).catch(e => setError(e.response?.data?.message || "Profile unavailable."));
  }, [username, isSharedView]);
  if (error) return <><Link to="/people" className="text-link"><ArrowLeft size={15}/> Back to people</Link><div className="error-message">{error}</div></>;
  if (!profile) return <div className="loading-screen">Loading profile…</div>;
  const { user, stats } = profile;
  const completedDays = isSharedView ? profile.roadmap.days.filter(day => day.completed).length : stats.completedDays;
  return <><Link to="/people" className="text-link"><ArrowLeft size={15}/> Back to people</Link><div className="profile-hero panel"><div className="avatar profile-avatar">{user.name[0].toUpperCase()}</div><div><div className="eyebrow">{isSharedView ? "SHARED ROADMAP OVERVIEW" : "DEVQUEST MEMBER"}</div><h1>{user.name}</h1><p className="muted">@{user.username}</p><p>{isSharedView ? "This view is shared with you by a roadmap contributor." : user.bio || "Focused on the next level."}</p></div></div><div className="stats-grid profile-stats"><div className="stat-card"><Trophy/><div className="stat-label">TOTAL XP</div><div className="stat-value">{stats.xp}</div></div><div className="stat-card"><Target/><div className="stat-label">ROADMAP</div><div className="stat-value">{stats.completionPercent}%</div></div><div className="stat-card"><Code2/><div className="stat-label">DSA SOLVED</div><div className="stat-value">{stats.dsaSolved}</div></div></div><div className="panel"><h3>Journey overview</h3><p className="muted">{completedDays} of {stats.roadmapDays} roadmap days completed · {stats.completedTasks} tasks done.</p><div className="large-track"><span style={{width:`${stats.completionPercent}%`}}/></div>{stats.solvedByDifficulty && <div className="profile-difficulty-counts">{["Easy", "Medium", "Hard"].map(level => <span key={level}><b>{level}</b>{stats.solvedByDifficulty[level] || 0} solved</span>)}</div>}{isSharedView && <p className="muted shared-private-note">Applications and private notes are not included in this shared overview.</p>}</div></>;
}
