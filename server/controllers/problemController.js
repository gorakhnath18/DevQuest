import Problem from "../models/Problem.js";
import ProblemProgress from "../models/ProblemProgress.js";
import XpEvent from "../models/XpEvent.js";
import { awardXp } from "../utils/xp.js";
import { completeAssignedTasks, uncompleteAssignedTasks } from "./customRoadmapController.js";

export async function listProblems(req, res) {
  const { q, topic, difficulty, platform } = req.query;
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(2000, Math.max(1, Number.parseInt(req.query.limit, 10) || 1000));
  const filter = { archived: false };
  if (topic) filter.topic = topic;
  if (difficulty) filter.difficulty = difficulty;
  if (platform) filter.platform = platform;
  if (q) {
    const escaped = String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (escaped) filter.$or = [
      { title: { $regex: escaped, $options: "i" } },
      { topic: { $regex: escaped, $options: "i" } },
      { pattern: { $regex: escaped, $options: "i" } }
    ];
  }
  const [problems, total, topics, platforms] = await Promise.all([
    Problem.find(filter).sort({ topic: 1, title: 1 }).skip((page - 1) * limit).limit(limit).lean(),
    Problem.countDocuments(filter),
    Problem.distinct("topic", { archived: false }),
    Problem.distinct("platform", { archived: false })
  ]);
  const progress = await ProblemProgress.find({ user: req.user._id, problem: { $in: problems.map(p => p._id) } }).lean();
  const map = new Map(progress.map(p => [String(p.problem), p]));
  res.json({
    items: problems.map(p => ({ ...p, userProgress: map.get(String(p._id)) || { status: "Not Started", notes: "", attempts: 0 } })),
    page, limit, total, topics: topics.sort(), platforms: platforms.sort()
  });
}

export async function createProblem(req, res) {
  const { title, topic, pattern, difficulty, platform, url } = req.body;
  if (!title || !topic || !difficulty || !platform || !url) return res.status(400).json({ message: "Title, topic, difficulty, platform and URL are required." });
  if (!/^https?:\/\//i.test(url)) return res.status(400).json({ message: "Please provide a valid http(s) URL." });
  const problem = await Problem.create({ title, topic, pattern, difficulty, platform, url, createdBy: req.user._id, updatedBy: req.user._id });
  res.status(201).json(problem);
}

export async function updateProblem(req, res) {
  const allowed = ["title", "topic", "pattern", "difficulty", "platform", "url"];
  const updates = {};
  for (const key of allowed) if (req.body[key] !== undefined) updates[key] = req.body[key];
  if (updates.url && !/^https?:\/\//i.test(updates.url)) return res.status(400).json({ message: "Please provide a valid http(s) URL." });
  updates.updatedBy = req.user._id;
  const problem = await Problem.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  if (!problem) return res.status(404).json({ message: "Problem not found." });
  res.json(problem);
}

export async function archiveProblem(req, res) {
  const problem = await Problem.findByIdAndUpdate(req.params.id, { archived: true, updatedBy: req.user._id }, { new: true });
  if (!problem) return res.status(404).json({ message: "Problem not found." });
  res.json({ message: "Problem archived." });
}

export async function updateProblemProgress(req, res) {
  const { status, notes, attempts } = req.body;
  const valid = ["Not Started", "Attempted", "Solved", "Revision Due"];
  if (!valid.includes(status)) return res.status(400).json({ message: "Invalid progress status." });
  const problem = await Problem.findById(req.params.id);
  if (!problem || problem.archived) return res.status(404).json({ message: "Problem not found." });
  let progress = await ProblemProgress.findOne({ user: req.user._id, problem: problem._id });
  const wasSolved = progress?.status === "Solved";
  if (!progress) progress = new ProblemProgress({ user: req.user._id, problem: problem._id });
  progress.status = status;
  progress.solvedAt = status === "Solved" ? progress.solvedAt || new Date() : null;
  if (notes !== undefined) progress.notes = String(notes).slice(0, 3000);
  if (attempts !== undefined) progress.attempts = Math.max(0, Math.min(1000, Number(attempts) || 0));
  if (status === "Solved" && !wasSolved) {
    const points = { Easy: 1, Medium: 2, Hard: 3 }[problem.difficulty];
    await awardXp(req.user._id, `problem:${problem._id}:solved`, points, `Solved ${problem.title}`);
  } else if (wasSolved && status !== "Solved") {
    await XpEvent.deleteOne({ user: req.user._id, key: `problem:${problem._id}:solved` });
  }
  await progress.save();
  if (status === "Solved" && !wasSolved) await completeAssignedTasks(req.user._id, problem);
  if (wasSolved && status !== "Solved") await uncompleteAssignedTasks(req.user._id, problem);
  const totalXp = await XpEvent.aggregate([{ $match: { user: req.user._id } }, { $group: { _id: null, total: { $sum: "$points" } } }]);
  res.json({ progress, xp: totalXp[0]?.total || 0 });
}
