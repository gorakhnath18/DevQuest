import { createHash, randomBytes } from "node:crypto";
import User from "../models/User.js";
import RoadmapDay from "../models/RoadmapDay.js";
import RoadmapProgress from "../models/RoadmapProgress.js";
import ProblemProgress from "../models/ProblemProgress.js";
import XpEvent from "../models/XpEvent.js";
import Roadmap from "../models/Roadmap.js";
import RoadmapTaskProgress from "../models/RoadmapTaskProgress.js";
import JobApplication from "../models/JobApplication.js";
import RoadmapInvite from "../models/RoadmapInvite.js";

async function statsFor(userId, includePrivate = false) {
  const [legacyRoadmapCount, legacyDayDocs, legacyProgress, legacyTasks, roadmaps, customProgress, solvedProgress, solvedByDifficulty, xp, applications] = await Promise.all([
    RoadmapDay.countDocuments(),
    RoadmapDay.find().select("tasks._id tasks.problems").lean(),
    RoadmapProgress.find({ user: userId }).select("day completedTasks").lean(),
    RoadmapDay.aggregate([{ $unwind: "$tasks" }, { $count: "count" }]),
    Roadmap.find({ owner: userId }).select("days").lean(),
    RoadmapTaskProgress.find({ user: userId, completed: true }).select("task roadmap").lean(),
    ProblemProgress.find({ user: userId, status: "Solved" }).select("problem").lean(),
    ProblemProgress.aggregate([
      { $match: { user: userId, status: "Solved" } },
      { $lookup: { from: "problems", localField: "problem", foreignField: "_id", as: "problem" } },
      { $unwind: "$problem" },
      { $group: { _id: "$problem.difficulty", count: { $sum: 1 } } }
    ]),
    XpEvent.aggregate([{ $match: { user: userId } }, { $group: { _id: null, total: { $sum: "$points" } } }]),
    includePrivate ? JobApplication.aggregate([
      { $match: { user: userId } },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]) : Promise.resolve([])
  ]);
  const legacyCompletedTaskIds = new Map(legacyProgress.map(item => [
    String(item.day), new Set(item.completedTasks.map(String))
  ]));
  const solvedProblemIds = new Set(solvedProgress.map(item => String(item.problem)));
  const legacyTaskIsComplete = (day, task) => task.problems?.length
    ? task.problems.every(problem => solvedProblemIds.has(String(problem)))
    : (legacyCompletedTaskIds.get(String(day._id)) || new Set()).has(String(task._id));
  const completedLegacyTasks = legacyDayDocs.reduce((sum, day) =>
    sum + day.tasks.filter(task => legacyTaskIsComplete(day, task)).length, 0);
  const completedLegacyDays = legacyDayDocs.filter(day => {
    return day.tasks.length > 0 && day.tasks.every(task => legacyTaskIsComplete(day, task));
  }).length;
  const completedCustomTaskIds = new Set(customProgress.map(item => `${item.roadmap}:${item.task}`));
  const customTasks = roadmaps.flatMap(roadmap => roadmap.days.flatMap(day => day.tasks.map(task => ({
    roadmapId: roadmap._id, taskId: task._id
  }))));
  const completedCustomTasks = customTasks.filter(task => completedCustomTaskIds.has(`${task.roadmapId}:${task.taskId}`)).length;
  const customDayCount = roadmaps.reduce((sum, roadmap) => sum + roadmap.days.length, 0);
  const customCompletedDays = roadmaps.reduce((sum, roadmap) => sum + roadmap.days.filter(day =>
    day.tasks.length > 0 && day.tasks.every(task => completedCustomTaskIds.has(`${roadmap._id}:${task._id}`))
  ).length, 0);
  const hasCustomRoadmaps = roadmaps.length > 0;
  const stats = {
    xp: xp[0]?.total || 0,
    completedDays: hasCustomRoadmaps ? customCompletedDays : completedLegacyDays,
    roadmapDays: hasCustomRoadmaps ? customDayCount : legacyRoadmapCount,
    dsaSolved: solvedProgress.length,
    solvedByDifficulty: {
      Easy: solvedByDifficulty.find(item => item._id === "Easy")?.count || 0,
      Medium: solvedByDifficulty.find(item => item._id === "Medium")?.count || 0,
      Hard: solvedByDifficulty.find(item => item._id === "Hard")?.count || 0
    },
    completedTasks: hasCustomRoadmaps ? completedCustomTasks : completedLegacyTasks,
    totalTasks: hasCustomRoadmaps ? customTasks.length : legacyTasks[0]?.count || 0,
    completionPercent: hasCustomRoadmaps
      ? customTasks.length ? Math.round(completedCustomTasks / customTasks.length * 100) : 0
      : legacyTasks[0]?.count ? Math.round(completedLegacyTasks / legacyTasks[0].count * 100) : 0
  };
  if (includePrivate) {
    stats.applications = applications.reduce((sum, item) => sum + item.count, 0);
    stats.interviews = applications.filter(item => ["Interview", "Selected", "Offer", "Accepted"].includes(item._id)).reduce((sum, item) => sum + item.count, 0);
    stats.offers = applications.filter(item => ["Offer", "Accepted"].includes(item._id)).reduce((sum, item) => sum + item.count, 0);
  }
  return stats;
}

export async function myStats(req, res) {
  res.json(await statsFor(req.user._id, true));
}

export async function searchProfiles(req, res) {
  const q = String(req.query.q || "").trim().toLowerCase();
  if (q.length < 2) return res.json([]);
  const users = await User.find({ username: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" }, isPublic: true }).select("name username bio").limit(12).lean();
  const results = await Promise.all(users.map(async u => ({ ...u, stats: await statsFor(u._id) })));
  res.json(results);
}

export async function publicProfile(req, res) {
  const user = await User.findOne({ username: req.params.username.toLowerCase(), isPublic: true }).select("name username bio createdAt").lean();
  if (!user) return res.status(404).json({ message: "Public profile not found." });
  res.json({ user, stats: await statsFor(user._id) });
}

function hashInviteCode(code) {
  return createHash("sha256").update(code).digest("hex");
}

export async function createRoadmapInvite(req, res) {
  const recipient = await User.findOne({ _id: req.params.userId, isPublic: true }).select("_id name username");
  if (!recipient || String(recipient._id) === String(req.user._id)) {
    return res.status(404).json({ message: "That DEVQUEST member is unavailable." });
  }
  const code = randomBytes(32).toString("base64url");
  const invitation = await RoadmapInvite.findOneAndUpdate(
    { sender: req.user._id, recipient: recipient._id },
    { $set: { status: "Pending", codeHash: hashInviteCode(code), acceptedAt: null } },
    { new: true, upsert: true, runValidators: true }
  );
  const baseUrl = process.env.CLIENT_URL || "http://localhost:5173";
  res.status(201).json({
    invite: { id: invitation._id, recipient: { name: recipient.name, username: recipient.username } },
    inviteLink: `${baseUrl}/roadmap-invite/${code}`
  });
}

export async function receivedRoadmapInvites(req, res) {
  const invitations = await RoadmapInvite.find({ recipient: req.user._id, status: "Pending" })
    .populate("sender", "name username")
    .sort({ createdAt: -1 })
    .lean();
  res.json(invitations.map(invite => ({
    id: invite._id,
    sender: invite.sender,
    createdAt: invite.createdAt
  })));
}

export async function getRoadmapInvite(req, res) {
  const invite = await RoadmapInvite.findOne({
    recipient: req.user._id,
    codeHash: hashInviteCode(req.params.token),
    status: "Pending"
  }).populate("sender", "name username").lean();
  if (!invite) return res.status(404).json({ message: "This roadmap invitation is invalid or no longer active." });
  res.json({ sender: invite.sender });
}

export async function respondToRoadmapInvite(req, res) {
  if (!["accept", "decline"].includes(req.params.action)) {
    return res.status(400).json({ message: "Invalid invitation action." });
  }
  const status = req.params.action === "accept" ? "Accepted" : "Declined";
  const fields = status === "Accepted" ? { status, acceptedAt: new Date() } : { status };
  const identifier = /^[a-f\d]{24}$/i.test(req.params.token)
    ? { _id: req.params.token }
    : { codeHash: hashInviteCode(req.params.token) };
  const invite = await RoadmapInvite.findOneAndUpdate(
    { recipient: req.user._id, status: "Pending", ...identifier },
    { $set: fields, $unset: { codeHash: 1 } },
    { new: true }
  ).populate("sender", "name username");
  if (!invite) return res.status(404).json({ message: "This roadmap invitation is invalid or no longer active." });
  res.json({ status, sender: invite.sender });
}

export async function listRoadmapContributors(req, res) {
  const invites = await RoadmapInvite.find({ sender: req.user._id, status: "Accepted" })
    .populate("recipient", "name username")
    .sort({ acceptedAt: -1 })
    .lean();
  res.json(invites.map(invite => ({
    id: invite._id,
    user: invite.recipient,
    acceptedAt: invite.acceptedAt
  })));
}

export async function sharedRoadmapOverview(req, res) {
  const owner = await User.findOne({ username: req.params.username.toLowerCase() })
    .select("name username roadmapStartDate")
    .lean();
  if (!owner) return res.status(404).json({ message: "Roadmap owner not found." });
  const invite = await RoadmapInvite.exists({
    sender: owner._id,
    recipient: req.user._id,
    status: "Accepted"
  });
  if (!invite) return res.status(403).json({ message: "Accept this member's roadmap invitation to view their overview." });

  const [days, progress, solvedProblems] = await Promise.all([
    RoadmapDay.find().sort({ day: 1 }).populate("tasks.problems", "_id").lean(),
    RoadmapProgress.find({ user: owner._id }).lean(),
    ProblemProgress.find({ user: owner._id, status: "Solved" }).select("problem").lean()
  ]);
  const progressByDay = new Map(progress.map(item => [String(item.day), item]));
  const solvedIds = new Set(solvedProblems.map(item => String(item.problem)));
  const roadmapDays = days.map(day => {
    const saved = progressByDay.get(String(day._id));
    const savedTaskIds = new Set(saved?.completedTasks.map(String) || []);
    const completedTasks = day.tasks.filter(task =>
      task.problems?.length
        ? task.problems.every(problem => solvedIds.has(String(problem._id)))
        : savedTaskIds.has(String(task._id))
    ).map(task => String(task._id));
    return {
      day: day.day,
      title: day.title,
      completed: day.tasks.length > 0 && completedTasks.length === day.tasks.length
    };
  });
  res.json({
    user: { name: owner.name, username: owner.username },
    stats: await statsFor(owner._id),
    roadmap: { startDate: owner.roadmapStartDate ? owner.roadmapStartDate.toISOString().slice(0, 10) : null, days: roadmapDays }
  });
}
