import RoadmapDay from "../models/RoadmapDay.js";
import RoadmapProgress from "../models/RoadmapProgress.js";
import XpEvent from "../models/XpEvent.js";
import { awardXp } from "../utils/xp.js";
import ProblemProgress from "../models/ProblemProgress.js";
import User from "../models/User.js";

function dateOnly(date) {
  return date ? date.toISOString().slice(0, 10) : null;
}

export async function getRoadmapSettings(req, res) {
  const user = await User.findById(req.user._id).select("roadmapStartDate").lean();
  res.json({ startDate: dateOnly(user.roadmapStartDate) });
}

export async function setRoadmapStartDate(req, res) {
  const { startDate } = req.body;
  if (typeof startDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    return res.status(400).json({ message: "Choose a valid roadmap start date." });
  }
  const parsed = new Date(`${startDate}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || dateOnly(parsed) !== startDate) {
    return res.status(400).json({ message: "Choose a valid roadmap start date." });
  }
  const updated = await User.findOneAndUpdate(
    { _id: req.user._id, roadmapStartDate: null },
    { $set: { roadmapStartDate: parsed } },
    { new: true }
  ).select("roadmapStartDate");
  const user = updated || await User.findById(req.user._id).select("roadmapStartDate");
  if (!user) return res.status(404).json({ message: "Account not found." });
  if (dateOnly(user.roadmapStartDate) !== startDate) {
    return res.status(409).json({ message: "Your roadmap start date is already set." });
  }
  res.json({ startDate: dateOnly(user.roadmapStartDate) });
}

export async function listRoadmap(req, res) {
  const [days, progress, solvedProblems] = await Promise.all([
    RoadmapDay.find().sort({ day: 1 }).populate("tasks.problems", "title topic difficulty platform url").lean(),
    RoadmapProgress.find({ user: req.user._id }).lean(),
    ProblemProgress.find({ user: req.user._id, status: "Solved" }).select("problem").lean()
  ]);
  const byDay = new Map(progress.map(p => [String(p.day), p]));
  const solvedIds = new Set(solvedProblems.map(item => String(item.problem)));
  res.json(days.map(day => {
    const p = byDay.get(String(day._id));
    const storedCompleted = new Set(p ? p.completedTasks.map(String) : []);
    const completedTasks = day.tasks.filter(task => {
      if (task.problems?.length) return task.problems.every(problem => solvedIds.has(String(problem._id)));
      return storedCompleted.has(String(task._id));
    }).map(task => String(task._id));
    const completed = day.tasks.length > 0 && day.tasks.every(task => completedTasks.includes(String(task._id)));
    return { ...day, progress: { completedTasks, completed } };
  }));
}

export async function toggleTask(req, res) {
  const { dayId, taskId } = req.params;
  const day = await RoadmapDay.findById(dayId);
  if (!day) return res.status(404).json({ message: "Roadmap day not found." });
  const task = day.tasks.id(taskId);
  if (!task) return res.status(404).json({ message: "Task not found." });
  if (task.problems?.length) return res.status(400).json({ message: "Complete each assigned problem using its checkbox." });

  let progress = await RoadmapProgress.findOne({ user: req.user._id, day: dayId });
  if (!progress) progress = new RoadmapProgress({ user: req.user._id, day: dayId });
  const alreadyDone = progress.completedTasks.some(id => String(id) === taskId);
  if (alreadyDone) return res.status(409).json({ message: "Completed roadmap tasks cannot be unchecked." });
  progress.completedTasks.push(task._id);
  await awardXp(req.user._id, `roadmap:${dayId}:${taskId}`, task.xp, `Completed: ${task.title}`);
  progress.completed = day.tasks.length > 0 && day.tasks.every(t => progress.completedTasks.some(id => String(id) === String(t._id)));
  await progress.save();
  const totalXp = await XpEvent.aggregate([{ $match: { user: req.user._id } }, { $group: { _id: null, total: { $sum: "$points" } } }]);
  res.json({ progress: { completedTasks: progress.completedTasks.map(String), completed: progress.completed }, xp: totalXp[0]?.total || 0 });
}
