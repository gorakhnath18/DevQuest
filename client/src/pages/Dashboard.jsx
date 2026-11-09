import { useEffect, useState } from "react";
import { Activity, ArrowRight, Award, BookOpen, BriefcaseBusiness, CheckCircle2, Code2, Flame, Target, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import StatCard from "../components/StatCard";
import CompanyEligibilityCard from "../components/CompanyEligibilityCard";

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [starterDays, setStarterDays] = useState([]);
  const [roadmapSettings, setRoadmapSettings] = useState(null);
  const [contributors, setContributors] = useState([]);
  const [startChoice, setStartChoice] = useState("today");
  const [savingStart, setSavingStart] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    Promise.all([api.get("/profiles/me/stats"), api.get("/roadmap"), api.get("/roadmap/settings"), api.get("/profiles/contributors")])
      .then(([s, legacy, settings, contributorResponse]) => {
        setStats(s.data);
        setStarterDays(legacy.data);
        setRoadmapSettings(settings.data);
        setContributors(contributorResponse.data);
      })
      .catch(e => setError(e.response?.data?.message || "Could not load dashboard."));
  }, []);

  async function setStartDate() {
    setSavingStart(true);
    setError("");
    try {
      const start = new Date();
      start.setDate(start.getDate() + (startChoice === "tomorrow" ? 1 : 0));
      const startDate = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
      const { data } = await api.put("/roadmap/settings/start-date", { startDate });
      setRoadmapSettings(data);
    } catch (e) {
      setError(e.response?.data?.message || "Could not set your roadmap start date.");
    } finally {
      setSavingStart(false);
    }
  }

  if (error) return <div className="error-message">{error}</div>;
  if (!stats || !roadmapSettings) return <div className="loading-screen">Loading your command center…</div>;
  const starterTasks = starterDays.reduce((count, day) => count + day.tasks.length, 0);
  const starterDone = starterDays.reduce((count, day) => count + day.progress.completedTasks.length, 0);
  const starterCompletedDays = starterDays.filter(day => day.tasks.length > 0 && day.progress.completed).length;
  const starterPercent = starterTasks ? Math.round(starterDone / starterTasks * 100) : 0;
  const nextDay = starterDays.find(day => !day.progress.completed) || starterDays[starterDays.length - 1];
  const dateParts = (value) => value.split("-").map(Number);
  const toDayNumber = (value) => {
    const [year, month, day] = dateParts(value);
    return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
  };
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const currentDay = roadmapSettings.startDate
    ? Math.max(0, Math.min(120, toDayNumber(today) - toDayNumber(roadmapSettings.startDate) + 1))
    : 0;
  const missedDays = roadmapSettings.startDate
    ? starterDays.filter(day => day.day < currentDay && !day.progress.completed)
    : [];
  const activeDay = starterDays.find(day => day.day === currentDay);
  return <>
    <div className="welcome-row"><div><div className="eyebrow">YOUR COMMAND CENTER</div><h1>Let's make it happen, <span>{user?.name?.split(" ")[0]}.</span></h1><p className="muted">Small consistent wins. One day closer to your SDE goal.</p></div><Link className="date-chip" to="/roadmap"><Activity size={16}/> STARTER 120-DAY ROADMAP</Link></div>
    {missedDays.length > 0 && <div className="roadmap-reminder" role="status"><div><strong>You have {missedDays.length} earlier roadmap day{missedDays.length === 1 ? "" : "s"} to catch up.</strong><span>Your roadmap stays open, so you can complete missed days or move ahead at your pace.</span></div><Link to="/roadmap">Catch up now <ArrowRight size={15}/></Link></div>}
    <section className="hero-card">
      <div className="hero-content"><div className="hero-tag"><span className="pulse"/> YOUR JOURNEY IS LIVE</div><h2>Progress is built<br/>one commit at a time.</h2><p>{currentDay === 0 ? "Your Day 1 starts tomorrow." : activeDay ? `Today's plan: Day ${activeDay.day} · ${activeDay.title}` : "Keep your momentum. Complete today's tasks and stack another win."}</p><Link className="hero-button" to="/roadmap">Continue roadmap <ArrowRight size={16}/></Link></div>
      <div className="hero-orbit"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="orbit-core"><Code2 size={42}/><strong>DQ</strong></div><div className="orbit-node node-a"><Trophy size={18}/></div><div className="orbit-node node-b"><Target size={18}/></div><div className="orbit-node node-c"><Flame size={18}/></div></div>
      <div className="hero-index">{String(currentDay).padStart(2, "0")} <span>/ 120 DAYS</span></div>
    </section>
    {roadmapSettings.startDate && <p className="roadmap-start-caption">{currentDay === 0 ? `Your roadmap starts ${roadmapSettings.startDate}.` : `Roadmap started ${roadmapSettings.startDate}.`} Complete days at your own pace; you can always move ahead.</p>}
    <div className="section-heading"><div><h3>Your performance</h3><p>Every metric tells part of your story.</p></div><span className="live-label"><span className="online-dot"/> LIVE STATS</span></div>
    <div className="stats-grid overview-stats-grid">
      <StatCard label="TOTAL XP" value={stats.xp.toLocaleString()} detail="Points earned so far" icon={Trophy} tone="purple"/>
      <StatCard label="STARTER ROADMAP" value={starterPercent} suffix="%" detail={`${starterDone} of ${starterTasks} tasks`} icon={Target} tone="green"/>
      <StatCard label="DAYS COMPLETED" value={starterCompletedDays} suffix=" / 120" detail="Starter roadmap days" icon={CheckCircle2} tone="blue"/>
      <StatCard label="DSA SOLVED" value={stats.dsaSolved} detail="Problems marked solved" icon={Code2} tone="orange"/>
      <StatCard label="APPLICATIONS" value={stats.applications || 0} detail={`${stats.interviews || 0} interviews · ${stats.offers || 0} offers`} icon={BriefcaseBusiness} tone="blue"/>
    </div>
    <section className="panel difficulty-progress"><div className="panel-head"><div><span className="eyebrow">DSA PRACTICE</span><h3>Problems solved by difficulty</h3></div><Code2 size={20}/></div><div className="difficulty-progress-grid">{["Easy", "Medium", "Hard"].map(level => <div key={level}><span className={`difficulty ${level.toLowerCase()}`}>{level}</span><strong>{stats.solvedByDifficulty?.[level] || 0}</strong></div>)}</div></section>
    <CompanyEligibilityCard/>
    <div className="lower-grid">
      <section className="panel next-panel"><div className="panel-head"><div><span className="eyebrow">STARTER ROADMAP · UP NEXT</span><h3>{nextDay ? `Day ${nextDay.day} · ${nextDay.title}` : "Roadmap ready"}</h3></div><BookOpen size={20}/></div><p className="muted">{nextDay?.phase || "Start your journey"} · {nextDay?.level || "Beginner"}</p><div className="task-preview">{(nextDay?.tasks || []).filter(t => !t.problems?.length).slice(0,2).map(t => <div key={t._id} className="task-line"><span className="task-dot"/>{t.title}<small>{nextDay?.progress.completedTasks.includes(t._id) ? "Done" : `+${t.xp} XP`}</small></div>)}{(nextDay?.tasks || []).filter(t => t.problems?.length).map(t => <div key={t._id} className="task-line"><span className="task-dot"/>{t.title}<small>{t.problems.length} problems</small></div>)}</div><Link to="/roadmap" className="text-link">Open starter roadmap <ArrowRight size={15}/></Link></section>
      <section className="panel progress-panel"><div className="panel-head"><div><span className="eyebrow">YOUR CONSISTENCY</span><h3>Starter roadmap progress</h3></div><Award size={20}/></div><div className="progress-ring-wrap"><div className="progress-ring" style={{"--progress": `${starterPercent}%`}}><div><strong>{starterPercent}%</strong><small>COMPLETE</small></div></div></div><p className="muted center">Keep showing up. Your future self is counting on it.</p></section>
    </div>
    {contributors.length > 0 && <section className="panel contributor-panel"><div className="panel-head"><div><span className="eyebrow">ROADMAP CONTRIBUTORS</span><h3>People following your roadmap</h3></div></div><div className="contributor-list">{contributors.map(item => <Link key={item.id} to={`/profile/${item.user.username}?shared=1`}><span className="avatar">{item.user.name[0].toUpperCase()}</span><span><b>{item.user.name}</b><small>@{item.user.username} · accepted contributor</small></span><ArrowRight size={16}/></Link>)}</div><p className="muted">Contributors can view your roadmap overview and progress. Your applications remain private.</p></section>}
    {!roadmapSettings.startDate && <div className="modal-backdrop" role="presentation"><section className="start-date-dialog" role="dialog" aria-modal="true" aria-labelledby="start-date-title"><div className="eyebrow">PERSONALIZE YOUR PLAN</div><h2 id="start-date-title">When would you like to start?</h2><p className="muted">Your Day 1 is scheduled from your selected date. You can complete days early or catch up later.</p><div className="start-date-options"><label><input type="radio" name="roadmap-start" value="today" checked={startChoice === "today"} onChange={() => setStartChoice("today")}/><span><b>Today</b><small>Start Day 1 now</small></span></label><label><input type="radio" name="roadmap-start" value="tomorrow" checked={startChoice === "tomorrow"} onChange={() => setStartChoice("tomorrow")}/><span><b>Tomorrow</b><small>Start counting from tomorrow</small></span></label></div><button className="primary-button full" disabled={savingStart} onClick={setStartDate}>{savingStart ? "Saving…" : "Set my start date"}</button></section></div>}
  </>;
}
