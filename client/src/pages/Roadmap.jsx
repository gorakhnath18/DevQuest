import { useEffect, useMemo, useState } from "react";
import { BookOpen, Check, ChevronDown, ChevronUp, ExternalLink, Search } from "lucide-react";
import api from "../services/api";
import "./roadmapBuilder.css";

function mapStudyPlanToRoadmapDays({ dsaProblems, studyDays }) {
  const problemsByDay = new Map();
  dsaProblems.forEach(problem => {
    const items = problemsByDay.get(problem.day) || [];
    items.push({ ...problem, _id: problem.sourceKey });
    problemsByDay.set(problem.day, items);
  });
  return studyDays.map(day => {
    const topics = day.lessons.map(lesson => lesson.title);
    const lesson = day.lessons.map(item => item.description).filter(Boolean).join(" ");
    const dayProblems = problemsByDay.get(day.day) || [];
    return {
      _id: `sheet-day-${day.day}`,
      day: day.day,
      phase: day.phase,
      title: topics.join(" · "),
      studyDate: day.date,
      resource: day.resource,
      level: day.day <= 40 ? "Beginner" : day.day <= 90 ? "Intermediate" : "Advanced",
      topics,
      lesson,
      progress: { completedTasks: [], completed: false },
      tasks: [
        {
          _id: `sheet-task-${day.day}`,
          title: `Study: ${day.title}`,
          description: lesson,
          xp: 5,
          problems: []
        },
        {
          _id: `sheet-dsa-task-${day.day}`,
          title: `DSA practice: ${[...new Set(dayProblems.map(problem => problem.topic))].join(", ")}`,
          description: "Solve the five problems assigned in the study-plan sheet.",
          xp: 0,
          problems: dayProblems
        }
      ]
    };
  });
}

export default function Roadmap() {
  const [days, setDays] = useState([]);
  const [problems, setProblems] = useState([]);
  const [openDay, setOpenDay] = useState(null);
  const [search, setSearch] = useState("");
  const [savingIds, setSavingIds] = useState([]);
  const [error, setError] = useState("");

  async function load() {
    setError("");
    const sheetDataRequest = import("../data/studyPlanSheet.json").then(module => module.default);
    try {
      const [roadmapResponse, problemsResponse, sheetData] = await Promise.all([
        api.get("/roadmap"),
        api.get("/problems", { params: { limit: 1000 } }),
        sheetDataRequest
      ]);
      const roadmapDays = Array.isArray(roadmapResponse.data) && roadmapResponse.data.length
        ? roadmapResponse.data
        : mapStudyPlanToRoadmapDays(sheetData);
      setDays(roadmapDays);
      setProblems(problemsResponse.data.items || []);
      setOpenDay(current => current || roadmapDays.find(day => !day.progress.completed)?._id || roadmapDays[0]?._id || null);
      setError("");
    } catch (e) {
      let sheetData;
      try {
        sheetData = await sheetDataRequest;
      } catch (dataError) {
        setError(dataError.message || "Unable to load the spreadsheet study plan.");
        return;
      }
      const fallbackDays = mapStudyPlanToRoadmapDays(sheetData);
      setDays(fallbackDays);
      setProblems(sheetData.dsaProblems.map(problem => ({
        ...problem,
        _id: problem.sourceKey,
        userProgress: { status: "Not Started", notes: "", attempts: 0 }
      })));
      setOpenDay(current => current || fallbackDays.find(day => !day.progress.completed)?._id || fallbackDays[0]?._id || null);
      setError(e.response?.data?.message || "Using the spreadsheet study plan offline. Progress saving requires the API.");
    }
  }

  useEffect(() => { load(); }, []);

  const problemById = useMemo(() => new Map(problems.map(problem => [problem._id, problem])), [problems]);
  const [majorTopics, setMajorTopics] = useState([]);
  useEffect(() => {
    import("../data/studyPlanSheet.json")
      .then(module => setMajorTopics(module.default.majorTopicTimeline))
      .catch(error => setError(error.message || "Unable to load major topic milestones."));
  }, []);
  const filteredDays = useMemo(() => days.filter(day =>
    `${day.day} ${day.title} ${day.phase} ${(day.topics || []).join(" ")}`
      .toLowerCase().includes(search.toLowerCase())
  ), [days, search]);
  const assignedProblems = days.flatMap(day => day.tasks.flatMap(task => task.problems || []));
  const solvedCount = assignedProblems.filter(problem => problemById.get(problem._id)?.userProgress?.status === "Solved").length;
  const studyTasks = days.flatMap(day => day.tasks.filter(task => !task.problems?.length));
  const completedStudyTasks = days.reduce((count, day) => count + day.progress.completedTasks.filter(taskId =>
    day.tasks.some(task => task._id === taskId && !task.problems?.length)
  ).length, 0);
  const xpForProblem = problem => ({ Easy: 1, Medium: 2, Hard: 3 }[problem.difficulty] || 1);

  async function toggleStudyTask(day, task) {
    if (savingIds.includes(task._id)) return;
    setSavingIds(ids => [...ids, task._id]);
    setError("");
    try {
      const { data } = await api.patch(`/roadmap/${day._id}/tasks/${task._id}`);
      setDays(items => items.map(item => item._id === day._id ? { ...item, progress: data.progress } : item));
    } catch (e) {
      setError(e.response?.data?.message || "Could not update this task.");
    } finally {
      setSavingIds(ids => ids.filter(id => id !== task._id));
    }
  }

  async function toggleProblemSolved(problem) {
    const current = problemById.get(problem._id);
    if (savingIds.includes(problem._id)) return;
    setSavingIds(ids => [...ids, problem._id]);
    setError("");
    try {
      const status = current?.userProgress?.status === "Solved" ? "Not Started" : "Solved";
      const { data } = await api.patch(`/problems/${problem._id}/progress`, { status });
      setProblems(items => items.map(item => item._id === problem._id
        ? { ...item, userProgress: data.progress }
        : item));
      const { data: updatedDays } = await api.get("/roadmap");
      setDays(updatedDays);
    } catch (e) {
      setError(e.response?.data?.message || "Could not mark this problem complete.");
    } finally {
      setSavingIds(ids => ids.filter(id => id !== problem._id));
    }
  }

  return <section className="starter-roadmap">
    <div className="page-title-row">
      <div>
        <div className="eyebrow">YOUR PERSONAL STUDY PLAN</div>
        <h1>Starter 120-Day Roadmap</h1>
        <p className="muted">One focused plan. Learn the day's concepts, then solve its linked practice problems.</p>
      </div>
      <div className="roadmap-count"><strong>{days.length}<span> / 120</span></strong><small>STUDY DAYS</small></div>
    </div>
    {error && <div className="error-message">{error}</div>}
    <div className="starter-roadmap-summary">
      <div><strong>{solvedCount}</strong><small>DSA PROBLEMS SOLVED</small></div>
      <div><strong>{assignedProblems.length}</strong><small>ASSIGNED PROBLEMS</small></div>
      <div><strong>{studyTasks.length ? Math.round(completedStudyTasks / studyTasks.length * 100) : 0}%</strong><small>STUDY TASKS DONE</small></div>
      <p>Easy problems earn 1 XP, Medium 2 XP, and Hard 3 XP. Click a checked box again to undo it.</p>
    </div>
    <section className="major-topic-timeline" aria-label="Major topic start days">
      <div className="major-topic-heading">
        <div><span className="eyebrow">MAJOR TOPIC MILESTONES</span><h2>When each area starts</h2></div>
        <span className="muted">Based on your 120-day sheet</span>
      </div>
      <div className="major-topic-grid">
        {majorTopics.map(topic => <article className="major-topic-card" key={`${topic.fromDay}-${topic.title}`}>
          <span>FROM DAY {String(topic.fromDay).padStart(2, "0")}</span>
          <b>{topic.title}</b>
          <small>Days {topic.fromDay}–{topic.toDay} · starts {topic.fromDate}</small>
        </article>)}
      </div>
    </section>
    <div className="roadmap-toolbar">
      <div className="search-box"><Search size={16}/><input aria-label="Find a roadmap day" placeholder="Find a day or topic…" value={search} onChange={event => setSearch(event.target.value)}/></div>
      <span className="muted">{days.length} days</span>
    </div>
    <div className="starter-day-list">
      {filteredDays.map(day => {
        const studyTasksForDay = day.tasks.filter(task => !task.problems?.length);
        const studyDone = studyTasksForDay.some(task => day.progress.completedTasks.includes(task._id)) ? 1 : 0;
        const studyTotal = studyTasksForDay.length ? 1 : 0;
        const dayProblems = day.tasks.flatMap(task => task.problems || []);
        const daySolved = dayProblems.filter(problem => problemById.get(problem._id)?.userProgress?.status === "Solved").length;
        const expanded = openDay === day._id;
        return <article className="starter-day-card" key={day._id}>
          <button className="starter-day-toggle" aria-expanded={expanded} onClick={() => setOpenDay(expanded ? null : day._id)}>
            <span className="rb-day-number">{String(day.day).padStart(2, "0")}</span>
            <span className="starter-day-title">
              <b>Day {day.day}: {day.title}</b>
              <small>{day.phase} · {studyDone}/{studyTotal} study tasks · {daySolved}/{dayProblems.length} problems</small>
            </span>
            {expanded ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}
          </button>
          {expanded && <div className="starter-day-content">
            {studyTasksForDay.slice(0, 1).map(task => {
              const checked = day.progress.completedTasks.includes(task._id);
              return <div className={`starter-study-task ${checked ? "completed" : ""}`} key={task._id}>
                <button type="button" className={`rb-check ${checked ? "checked" : ""}`} role="checkbox" aria-checked={checked} disabled={savingIds.includes(task._id)} aria-label={`${checked ? "Unmark" : "Mark"} ${task.title} ${checked ? "incomplete" : "complete"}`} onClick={() => toggleStudyTask(day, task)}>{checked && <Check size={14}/>}</button>
                <div className="starter-study-copy">
                  <b><BookOpen size={14}/> What to learn: {task.title.replace(/^Study:\s*/, "")}</b>
                  {(day.studyDate || day.resource) && <small>{[day.studyDate, day.resource].filter(Boolean).join(" · ")}</small>}
                  {day.lesson && <p>{day.lesson}</p>}
                  {!!day.topics?.length && <ul>{day.topics.map(topic => <li key={topic}>{topic}</li>)}</ul>}
                </div>
                <em>+{task.xp} XP</em>
              </div>;
            })}
            <section className="starter-problems">
              <h3>Daily practice <span>{daySolved}/{dayProblems.length} done</span></h3>
              {dayProblems.map(problem => {
                const current = problemById.get(problem._id) || problem;
                const solved = current.userProgress?.status === "Solved";
                return <div className={`starter-problem ${solved ? "completed" : ""}`} key={`${day._id}-${problem._id}`}>
                  <input type="checkbox" checked={solved} disabled={savingIds.includes(problem._id)} aria-label={`Mark ${problem.title} ${solved ? "unsolved" : "solved"}`} onChange={() => toggleProblemSolved(problem)}/>
                  <span className="starter-problem-copy"><a href={problem.url} target="_blank" rel="noreferrer">{problem.title} <ExternalLink size={12}/></a><small>{problem.topic} · {problem.difficulty} · {problem.platform}</small></span>
                  <em>+{xpForProblem(current)} XP</em>
                </div>;
              })}
              {!dayProblems.length && <p className="rb-hint">No problems are assigned to this day yet.</p>}
            </section>
          </div>}
        </article>;
      })}
      {!filteredDays.length && <div className="empty-state">No roadmap days match your search.</div>}
    </div>
  </section>;
}
