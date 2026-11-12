import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Plus, Search, SlidersHorizontal } from "lucide-react";
import api from "../services/api";

export default function DSA() {
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState("All");
  const [topic, setTopic] = useState("All");
  const [platform, setPlatform] = useState("All");
  const [platforms, setPlatforms] = useState([]);
  const [sheetTopics, setSheetTopics] = useState([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [savingIds, setSavingIds] = useState([]);
  const [form, setForm] = useState({ title:"", topic:"Arrays", pattern:"", difficulty:"Easy", platform:"LeetCode", url:"" });
  async function load() {
    const sheetDataRequest = import("../data/studyPlanSheet.json").then(module => module.default);
    try {
      const [{ data }, sheetData] = await Promise.all([
        api.get("/problems", { params: { limit: 1000, platform: platform === "All" ? undefined : platform } }),
        sheetDataRequest
      ]);
      setItems(data.items);
      setTotal(data.total);
      setPlatforms(data.platforms || []);
      setSheetTopics([...new Set(sheetData.dsaProblems.map(problem => problem.topic))]);
      setError("");
    } catch (e) {
      let sheetData;
      try {
        sheetData = await sheetDataRequest;
      } catch (dataError) {
        setError(dataError.message || "Unable to load the spreadsheet DSA data.");
        return;
      }
      const sheetItems = sheetData.dsaProblems
        .filter(problem => platform === "All" || problem.platform === platform)
        .map(problem => ({
          ...problem,
          _id: problem.sourceKey,
          userProgress: { status: "Not Started", notes: "", attempts: 0 }
        }));
      setItems(sheetItems);
      setTotal(sheetItems.length);
      setPlatforms([...new Set(sheetData.dsaProblems.map(problem => problem.platform))]);
      setSheetTopics([...new Set(sheetData.dsaProblems.map(problem => problem.topic))]);
      setError(e.response?.data?.message || "Showing spreadsheet DSA data offline; progress saving requires the API.");
    }
  }
  useEffect(() => { load(); }, [platform]);
  const topics = useMemo(() => [...new Set([...sheetTopics, ...items.map(p => p.topic)])].sort(), [items, sheetTopics]);
  const filtered = items.filter(p => (difficulty === "All" || p.difficulty === difficulty) && (topic === "All" || p.topic === topic) && `${p.title} ${p.topic} ${p.pattern}`.toLowerCase().includes(query.toLowerCase()));
  async function toggleSolved(problem) {
    if (savingIds.includes(problem._id)) return;
    setSavingIds(ids => [...ids, problem._id]);
    setError("");
    try {
      const status = problem.userProgress?.status === "Solved" ? "Not Started" : "Solved";
      const { data } = await api.patch(`/problems/${problem._id}/progress`, { status });
      setItems(prev => prev.map(p => p._id === problem._id ? { ...p, userProgress: data.progress } : p));
    } catch (e) { setError(e.response?.data?.message || "Could not update status."); }
    finally { setSavingIds(ids => ids.filter(id => id !== problem._id)); }
  }
  async function addProblem(e) {
    e.preventDefault(); setError("");
    try { await api.post("/problems", form); setShowAdd(false); setForm({title:"",topic:"Arrays",pattern:"",difficulty:"Easy",platform:"LeetCode",url:""}); load(); }
    catch (e) { setError(e.response?.data?.message || "Could not add problem."); }
  }
  const solved = items.filter(p => p.userProgress?.status === "Solved").length;
  const solvedByDifficulty = {
    Easy: items.filter(p => p.difficulty === "Easy" && p.userProgress?.status === "Solved").length,
    Medium: items.filter(p => p.difficulty === "Medium" && p.userProgress?.status === "Solved").length,
    Hard: items.filter(p => p.difficulty === "Hard" && p.userProgress?.status === "Solved").length
  };
  return <>
    <div className="page-title-row"><div><div className="eyebrow">PRACTICE ARENA</div><h1>DSA Library</h1><p className="muted">Open a problem to practice, then check it when solved. Click again to undo. Easy earns 1 XP, Medium 2 XP, and Hard 3 XP.</p></div><button className="primary-button" onClick={() => setShowAdd(v => !v)}><Plus size={17}/> Add problem</button></div>
    <div className="dsa-summary"><div><strong>{total}</strong><small>LIBRARY PROBLEMS</small></div><div><strong>{solved}</strong><small>SOLVED BY YOU</small></div><div><strong>{total ? Math.round(solved/total*100) : 0}%</strong><small>YOUR COMPLETION</small></div></div>
    <div className="dsa-difficulty-summary">{["Easy", "Medium", "Hard"].map(level => <div key={level}><span className={`difficulty ${level.toLowerCase()}`}>{level}</span><strong>{solvedByDifficulty[level]}</strong><small>SOLVED</small></div>)}</div>
    {showAdd && <form className="panel add-problem-form" onSubmit={addProblem}><h3>Add to shared library</h3><div className="form-grid"><label>Problem title<input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label><label>Topic<input required value={form.topic} onChange={e=>setForm({...form,topic:e.target.value})}/></label><label>Pattern<input value={form.pattern} onChange={e=>setForm({...form,pattern:e.target.value})}/></label><label>Difficulty<select value={form.difficulty} onChange={e=>setForm({...form,difficulty:e.target.value})}><option>Easy</option><option>Medium</option><option>Hard</option></select></label><label>Platform<input required value={form.platform} onChange={e=>setForm({...form,platform:e.target.value})}/></label><label>Problem URL<input required type="url" value={form.url} onChange={e=>setForm({...form,url:e.target.value})}/></label></div><button className="primary-button">Save problem</button></form>}
    {error && <div className="error-message">{error}</div>}
    <div className="library-toolbar"><div className="search-box"><Search size={17}/><input placeholder="Search problems, topics, patterns…" value={query} onChange={e=>setQuery(e.target.value)}/></div><div className="select-filter"><SlidersHorizontal size={16}/><select value={platform} onChange={e=>{setTopic("All");setPlatform(e.target.value)}}><option value="All">All platforms</option>{platforms.map(name=><option key={name}>{name}</option>)}</select><select value={topic} onChange={e=>setTopic(e.target.value)}><option value="All">All topics</option>{topics.map(t=><option key={t}>{t}</option>)}</select><select value={difficulty} onChange={e=>setDifficulty(e.target.value)}><option value="All">All levels</option><option>Easy</option><option>Medium</option><option>Hard</option></select></div></div>
    <div className="problem-table-wrap"><table className="problem-table"><thead><tr><th>DONE</th><th>PROBLEM</th><th>TOPIC / PATTERN</th><th>LEVEL</th><th>LINK</th></tr></thead><tbody>{filtered.map(p=>{const solved=p.userProgress?.status==="Solved";return <tr key={p._id}><td><input aria-label={`${solved ? "Unmark" : "Mark"} ${p.title} ${solved ? "unsolved" : "solved"}`} type="checkbox" checked={solved} disabled={savingIds.includes(p._id)} onChange={() => toggleSolved(p)}/></td><td><b>{p.title}</b><small>{p.platform}</small></td><td>{p.topic}<small>{p.pattern || "—"}</small></td><td><span className={`difficulty ${p.difficulty.toLowerCase()}`}>{p.difficulty}</span></td><td><a href={p.url} target="_blank" rel="noreferrer" className="external-link">Open problem <ExternalLink size={14}/></a></td></tr>})}</tbody></table>{filtered.length===0 && <div className="empty-state">No problems match your filters.</div>}</div>
  </>;
}
