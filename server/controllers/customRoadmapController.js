import mongoose from "mongoose";
import Problem from "../models/Problem.js";
import Roadmap from "../models/Roadmap.js";
import RoadmapTaskProgress from "../models/RoadmapTaskProgress.js";
import RoadmapDay from "../models/RoadmapDay.js";
import RoadmapProgress from "../models/RoadmapProgress.js";
import ProblemProgress from "../models/ProblemProgress.js";
import XpEvent from "../models/XpEvent.js";
import { awardXp } from "../utils/xp.js";

const levels = ["Beginner", "Intermediate", "Advanced"];
const priorities = ["Low", "Medium", "High"];

function isValidId(value) {
  return mongoose.Types.ObjectId.isValid(value);
}

function roadmapPayload(roadmap, progress) {
  const progressByTask = new Map(progress.map(item => [String(item.task), item]));
  return {
    ...roadmap,
    days: roadmap.days.map(day => ({
      ...day,
      tasks: day.tasks.map(task => ({
        ...task,
        progress: progressByTask.get(String(task._id)) || { completed: false }
      }))
    }))
  };
}

async function findOwnedRoadmap(roadmapId, userId) {
  if (!isValidId(roadmapId)) return null;
  return Roadmap.findOne({ _id: roadmapId, owner: userId });
}

async function validateProblems(problemIds) {
  if (!Array.isArray(problemIds) || problemIds.length > 30) return null;
  const ids = [...new Set(problemIds.map(String))];
  if (!ids.every(isValidId)) return null;
  if (!ids.length) return [];
  const problems = await Problem.find({ _id: { $in: ids }, archived: false }).select("_id").lean();
  return problems.length === ids.length ? ids : null;
}

async function markProblemSolved(userId, problemId) {
  const problem = await Problem.findById(problemId);
  if (!problem || problem.archived) return;
  let progress = await ProblemProgress.findOne({ user: userId, problem: problem._id });
  if (progress?.status === "Solved") return;
  if (!progress) progress = new ProblemProgress({ user: userId, problem: problem._id });
  progress.status = "Solved";
  progress.solvedAt = new Date();
  await progress.save();
  const points = { Easy: 1, Medium: 2, Hard: 3 }[problem.difficulty];
  await awardXp(userId, `problem:${problem._id}:solved`, points, `Solved ${problem.title}`);
  await completeAssignedTasks(userId, problem);
}

async function markProblemUnsolved(userId, problemId) {
  const problem = await Problem.findById(problemId);
  if (!problem) return;
  const progress = await ProblemProgress.findOne({ user: userId, problem: problem._id });
  if (progress?.status !== "Solved") return;
  progress.status = "Not Started";
  progress.solvedAt = null;
  await progress.save();
  await XpEvent.deleteOne({ user: userId, key: `problem:${problem._id}:solved` });
  await uncompleteAssignedTasks(userId, problem);
}

function normalizeSubjects(subjects) {
  if (subjects === undefined) return undefined;
  if (!Array.isArray(subjects) || subjects.length > 30) return null;
  const normalized = [];
  for (const subject of subjects) {
    if (!subject || typeof subject !== "object") return null;
    const topics = subject.topics === undefined ? [] : subject.topics;
    if (!Array.isArray(topics) || topics.length > 100) return null;
    const normalizedTopics = [];
    for (const topic of topics) {
      if (!topic || typeof topic !== "object") return null;
      const resources = topic.resources === undefined ? [] : topic.resources;
      if (!Array.isArray(resources) || resources.length > 30) return null;
      if (resources.some(resource => !resource || typeof resource !== "object")) return null;
      normalizedTopics.push({
        title: String(topic.title || "").trim(),
        description: String(topic.description || "").trim(),
        resources: resources.map(resource => ({
          label: String(resource.label || "").trim(),
          url: String(resource.url || "").trim()
        }))
      });
    }
    normalized.push({ name: String(subject.name || "").trim(), topics: normalizedTopics });
  }
  return normalized;
}

function validSubjects(subjects) {
  return subjects.every(subject => subject.name && subject.topics.every(topic =>
    topic.title && topic.resources.every(resource => !resource.url || /^https?:\/\//i.test(resource.url))
  ));
}

export async function listCustomRoadmaps(req, res) {
  const [roadmaps, progress] = await Promise.all([
    Roadmap.find({ owner: req.user._id }).sort({ updatedAt: -1 }).populate("days.tasks.problems", "title topic difficulty platform url").lean(),
    RoadmapTaskProgress.find({ user: req.user._id }).lean()
  ]);
  const progressByRoadmap = new Map();
  for (const item of progress) {
    const key = String(item.roadmap);
    if (!progressByRoadmap.has(key)) progressByRoadmap.set(key, []);
    progressByRoadmap.get(key).push(item);
  }
  res.json(roadmaps.map(roadmap => roadmapPayload(roadmap, progressByRoadmap.get(String(roadmap._id)) || [])));
}

export async function createCustomRoadmap(req, res) {
  const { name, description = "", startDate, duration, targetRole = "", difficulty = "Beginner", dailyStudyHours = 2, visibility = "Private" } = req.body;
  const parsedDuration = Number(duration);
  const parsedHours = Number(dailyStudyHours);
  const parsedStart = new Date(startDate);
  if (!String(name || "").trim() || String(name).trim().length > 120 ||
      !startDate || Number.isNaN(parsedStart.getTime()) ||
      !Number.isInteger(parsedDuration) || parsedDuration < 1 || parsedDuration > 730 ||
      !levels.includes(difficulty) || !Number.isFinite(parsedHours) || parsedHours < 0.25 || parsedHours > 24 ||
      !["Private", "Public"].includes(visibility)) {
    return res.status(400).json({ message: "Provide a name, valid start date, duration (1–730 days), difficulty, study hours and visibility." });
  }
  const roadmap = await Roadmap.create({
    owner: req.user._id, name, description, startDate: parsedStart, duration: parsedDuration,
    targetRole, difficulty, dailyStudyHours: parsedHours, visibility
  });
  res.status(201).json(roadmap);
}

export async function updateCustomRoadmap(req, res) {
  const roadmap = await findOwnedRoadmap(req.params.roadmapId, req.user._id);
  if (!roadmap) return res.status(404).json({ message: "Roadmap not found." });
  const allowed = ["name", "description", "startDate", "duration", "targetRole", "difficulty", "dailyStudyHours", "visibility"];
  for (const key of allowed) {
    if (req.body[key] === undefined) continue;
    if (key === "name" && !String(req.body[key]).trim()) return res.status(400).json({ message: "Roadmap name is required." });
    if (key === "startDate" && Number.isNaN(new Date(req.body[key]).getTime())) return res.status(400).json({ message: "Start date is invalid." });
    if (key === "duration" && (!Number.isInteger(Number(req.body[key])) || Number(req.body[key]) < 1 || Number(req.body[key]) > 730)) return res.status(400).json({ message: "Duration must be between 1 and 730 days." });
    if (key === "difficulty" && !levels.includes(req.body[key])) return res.status(400).json({ message: "Difficulty is invalid." });
    if (key === "dailyStudyHours" && (!Number.isFinite(Number(req.body[key])) || Number(req.body[key]) < 0.25 || Number(req.body[key]) > 24)) return res.status(400).json({ message: "Daily study hours must be between 0.25 and 24." });
    if (key === "visibility" && !["Private", "Public"].includes(req.body[key])) return res.status(400).json({ message: "Visibility is invalid." });
    roadmap.set(key, req.body[key]);
  }
  await roadmap.save();
  res.json(roadmap);
}

export async function deleteCustomRoadmap(req, res) {
  const roadmap = await findOwnedRoadmap(req.params.roadmapId, req.user._id);
  if (!roadmap) return res.status(404).json({ message: "Roadmap not found." });
  await Promise.all([
    roadmap.deleteOne(),
    RoadmapTaskProgress.deleteMany({ roadmap: roadmap._id })
  ]);
  res.json({ message: "Roadmap deleted." });
}

export async function createRoadmapDay(req, res) {
  const roadmap = await findOwnedRoadmap(req.params.roadmapId, req.user._id);
  if (!roadmap) return res.status(404).json({ message: "Roadmap not found." });
  const dayNumber = req.body.dayNumber === undefined
    ? Math.max(0, ...roadmap.days.map(day => day.dayNumber)) + 1
    : Number(req.body.dayNumber);
  const title = String(req.body.title || "").trim();
  const subjects = normalizeSubjects(req.body.subjects || []);
  if (!title || title.length > 180 || !Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > 1000 ||
      roadmap.days.some(day => day.dayNumber === dayNumber) || !subjects || !validSubjects(subjects)) {
    return res.status(400).json({ message: "Provide a unique day number, title and valid subjects/topics." });
  }
  roadmap.days.push({ dayNumber, title, subjects, notes: req.body.notes || "", revisionItems: req.body.revisionItems || [] });
  await roadmap.save();
  res.status(201).json(roadmap.days[roadmap.days.length - 1]);
}

export async function updateRoadmapDay(req, res) {
  const roadmap = await findOwnedRoadmap(req.params.roadmapId, req.user._id);
  const day = roadmap?.days.id(req.params.dayId);
  if (!day) return res.status(404).json({ message: "Roadmap day not found." });
  if (req.body.title !== undefined) {
    const title = String(req.body.title).trim();
    if (!title || title.length > 180) return res.status(400).json({ message: "Day title is required and must be under 180 characters." });
    day.title = title;
  }
  if (req.body.dayNumber !== undefined) {
    const dayNumber = Number(req.body.dayNumber);
    if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > 1000 || roadmap.days.some(item => item.id !== day.id && item.dayNumber === dayNumber)) {
      return res.status(400).json({ message: "Day number must be unique and between 1 and 1000." });
    }
    day.dayNumber = dayNumber;
  }
  if (req.body.subjects !== undefined) {
    const subjects = normalizeSubjects(req.body.subjects);
    if (!subjects || !validSubjects(subjects)) return res.status(400).json({ message: "Subjects, topics or resource URLs are invalid." });
    day.subjects = subjects;
  }
  if (req.body.notes !== undefined) day.notes = String(req.body.notes);
  if (req.body.revisionItems !== undefined) day.revisionItems = req.body.revisionItems;
  await roadmap.save();
  res.json(day);
}

export async function deleteRoadmapDay(req, res) {
  const roadmap = await findOwnedRoadmap(req.params.roadmapId, req.user._id);
  const day = roadmap?.days.id(req.params.dayId);
  if (!day) return res.status(404).json({ message: "Roadmap day not found." });
  const taskIds = day.tasks.map(task => task._id);
  day.deleteOne();
  await roadmap.save();
  await RoadmapTaskProgress.deleteMany({ roadmap: roadmap._id, task: { $in: taskIds } });
  res.json({ message: "Day deleted." });
}

export async function createRoadmapTask(req, res) {
  const roadmap = await findOwnedRoadmap(req.params.roadmapId, req.user._id);
  const day = roadmap?.days.id(req.params.dayId);
  if (!day) return res.status(404).json({ message: "Roadmap day not found." });
  const title = String(req.body.title || "").trim();
  const estimatedMinutes = Number(req.body.estimatedMinutes ?? 30);
  const problems = await validateProblems(req.body.problems || []);
  if (!title || title.length > 180 || !Number.isInteger(estimatedMinutes) || estimatedMinutes < 0 || estimatedMinutes > 1440 ||
      !priorities.includes(req.body.priority || "Medium") || !levels.includes(req.body.difficulty || "Beginner") || !problems) {
    return res.status(400).json({ message: "Provide a valid task title, estimate, priority, difficulty and DSA selection." });
  }
  day.tasks.push({
    title, description: req.body.description || "", estimatedMinutes,
    priority: req.body.priority || "Medium", difficulty: req.body.difficulty || "Beginner",
    notes: req.body.notes || "", problems
  });
  await roadmap.save();
  const task = day.tasks[day.tasks.length - 1].toObject();
  task.problems = await Problem.find({ _id: { $in: problems } }).select("title topic difficulty platform url").lean();
  task.progress = { completed: false };
  res.status(201).json(task);
}

export async function updateRoadmapTask(req, res) {
  const roadmap = await findOwnedRoadmap(req.params.roadmapId, req.user._id);
  const day = roadmap?.days.id(req.params.dayId);
  const task = day?.tasks.id(req.params.taskId);
  if (!task) return res.status(404).json({ message: "Task not found." });
  const fields = ["title", "description", "estimatedMinutes", "priority", "difficulty", "notes"];
  for (const key of fields) {
    if (req.body[key] === undefined) continue;
    const value = req.body[key];
    if (key === "title" && (!String(value).trim() || String(value).trim().length > 180)) return res.status(400).json({ message: "Task title is required and must be under 180 characters." });
    if (key === "estimatedMinutes" && (!Number.isInteger(Number(value)) || Number(value) < 0 || Number(value) > 1440)) return res.status(400).json({ message: "Estimated minutes must be between 0 and 1440." });
    if (key === "priority" && !priorities.includes(value)) return res.status(400).json({ message: "Priority is invalid." });
    if (key === "difficulty" && !levels.includes(value)) return res.status(400).json({ message: "Difficulty is invalid." });
    task.set(key, value);
  }
  if (req.body.problems !== undefined) {
    const problems = await validateProblems(req.body.problems);
    if (!problems) return res.status(400).json({ message: "One or more selected DSA problems are invalid." });
    task.problems = problems;
  }
  await roadmap.save();
  await roadmap.populate({ path: "days.tasks.problems", select: "title topic difficulty platform url" });
  res.json(task);
}

export async function deleteRoadmapTask(req, res) {
  const roadmap = await findOwnedRoadmap(req.params.roadmapId, req.user._id);
  const day = roadmap?.days.id(req.params.dayId);
  const task = day?.tasks.id(req.params.taskId);
  if (!task) return res.status(404).json({ message: "Task not found." });
  const taskId = task._id;
  task.deleteOne();
  await roadmap.save();
  await RoadmapTaskProgress.deleteMany({ roadmap: roadmap._id, task: taskId });
  res.json({ message: "Task deleted." });
}

export async function toggleRoadmapTask(req, res) {
  const roadmap = await findOwnedRoadmap(req.params.roadmapId, req.user._id);
  const task = roadmap?.days.id(req.params.dayId)?.tasks.id(req.params.taskId);
  if (!task) return res.status(404).json({ message: "Task not found." });
  let progress = await RoadmapTaskProgress.findOne({ user: req.user._id, roadmap: roadmap._id, task: task._id });
  if (!progress) progress = new RoadmapTaskProgress({ user: req.user._id, roadmap: roadmap._id, task: task._id });
  progress.completed = !progress.completed;
  progress.completedAt = progress.completed ? new Date() : undefined;
  await progress.save();
  if (progress.completed) {
    await awardXp(req.user._id, `custom-roadmap:${roadmap._id}:${task._id}`, task.xp, `Completed: ${task.title}`);
    for (const problemId of task.problems) await markProblemSolved(req.user._id, problemId);
  } else {
    await XpEvent.deleteOne({ user: req.user._id, key: `custom-roadmap:${roadmap._id}:${task._id}` });
    for (const problemId of task.problems) await markProblemUnsolved(req.user._id, problemId);
  }
  res.json({ progress: { completed: progress.completed, completedAt: progress.completedAt } });
}

export async function completeAssignedTasks(userId, problem) {
  const roadmaps = await Roadmap.find({ owner: userId, "days.tasks.problems": problem._id });
  const completedProblemIds = new Set((await ProblemProgress.find({ user: userId, status: "Solved" }).select("problem").lean())
    .map(progress => String(progress.problem)));
  for (const roadmap of roadmaps) {
    for (const day of roadmap.days) {
      for (const task of day.tasks) {
        if (!task.problems.some(id => String(id) === String(problem._id))) continue;
        if (!task.problems.every(id => completedProblemIds.has(String(id)))) continue;
        await RoadmapTaskProgress.findOneAndUpdate(
          { user: userId, roadmap: roadmap._id, task: task._id },
          { $set: { completed: true, completedAt: new Date() } },
          { new: true, upsert: true, setDefaultsOnInsert: true }
        );
        await awardXp(userId, `custom-roadmap:${roadmap._id}:${task._id}`, task.xp, `Completed: ${task.title}`);
      }
    }
  }
  const legacyDays = await RoadmapDay.find({ "tasks.problems": problem._id });
  for (const day of legacyDays) {
    const task = day.tasks.find(entry => entry.problems.some(id => String(id) === String(problem._id)));
    if (!task) continue;
    if (!task.problems.every(id => completedProblemIds.has(String(id)))) continue;
    let progress = await RoadmapProgress.findOne({ user: userId, day: day._id });
    if (!progress) progress = new RoadmapProgress({ user: userId, day: day._id });
    if (!progress.completedTasks.some(id => String(id) === String(task._id))) {
      progress.completedTasks.push(task._id);
      progress.completed = day.tasks.length > 0 && day.tasks.every(entry =>
        progress.completedTasks.some(id => String(id) === String(entry._id))
      );
      await progress.save();
    }
    await awardXp(userId, `roadmap:${day._id}:${task._id}`, task.xp, `Completed: ${task.title}`);
  }
}

export async function uncompleteAssignedTasks(userId, problem) {
  const roadmaps = await Roadmap.find({ owner: userId, "days.tasks.problems": problem._id });
  const completedProblemIds = new Set((await ProblemProgress.find({ user: userId, status: "Solved" }).select("problem").lean())
    .map(progress => String(progress.problem)));
  for (const roadmap of roadmaps) {
    for (const day of roadmap.days) {
      for (const task of day.tasks) {
        if (!task.problems.some(id => String(id) === String(problem._id))) continue;
        if (task.problems.every(id => completedProblemIds.has(String(id)))) continue;
        await RoadmapTaskProgress.findOneAndUpdate(
          { user: userId, roadmap: roadmap._id, task: task._id, completed: true },
          { $set: { completed: false }, $unset: { completedAt: 1 } }
        );
        await XpEvent.deleteOne({ user: userId, key: `custom-roadmap:${roadmap._id}:${task._id}` });
      }
    }
  }

  const legacyDays = await RoadmapDay.find({ "tasks.problems": problem._id });
  for (const day of legacyDays) {
    const task = day.tasks.find(entry => entry.problems.some(id => String(id) === String(problem._id)));
    if (!task || task.problems.every(id => completedProblemIds.has(String(id)))) continue;
    const progress = await RoadmapProgress.findOne({ user: userId, day: day._id });
    if (!progress?.completedTasks.some(id => String(id) === String(task._id))) continue;
    progress.completedTasks = progress.completedTasks.filter(id => String(id) !== String(task._id));
    progress.completed = day.tasks.length > 0 && day.tasks.every(entry =>
      progress.completedTasks.some(id => String(id) === String(entry._id))
    );
    await progress.save();
    await XpEvent.deleteOne({ user: userId, key: `roadmap:${day._id}:${task._id}` });
  }
}
