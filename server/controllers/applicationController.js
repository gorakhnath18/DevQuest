import mongoose from "mongoose";
import Company from "../models/Company.js";
import JobApplication from "../models/JobApplication.js";

const statuses = ["Interested", "Applied", "Assessment", "Interview", "Selected", "Offer", "Accepted", "Rejected", "Withdrawn"];
const interviewStatuses = new Set(["Assessment", "Interview", "Selected", "Offer", "Accepted"]);

export async function listApplications(req, res) {
  const filter = { user: req.user._id };
  if (req.query.status && statuses.includes(String(req.query.status))) filter.status = String(req.query.status);
  const [items, grouped] = await Promise.all([
    JobApplication.find(filter).sort({ updatedAt: -1 }).populate("company", "name industry website careersPage").lean(),
    JobApplication.aggregate([
      { $match: { user: req.user._id } },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ])
  ]);
  const counts = Object.fromEntries(grouped.map(item => [item._id, item.count]));
  res.json({
    items,
    counts: {
      total: items.length,
      applied: grouped.filter(item => item._id !== "Interested" && item._id !== "Withdrawn").reduce((sum, item) => sum + item.count, 0),
      interviews: grouped.filter(item => interviewStatuses.has(item._id)).reduce((sum, item) => sum + item.count, 0),
      offers: counts.Offer || 0,
      accepted: counts.Accepted || 0,
      rejected: counts.Rejected || 0
    },
    statuses
  });
}

export async function upsertApplication(req, res) {
  const { companyId } = req.params;
  const { status, role, jobUrl, interviewAt, nextFollowUpAt, privateNotes } = req.body;
  if (!mongoose.Types.ObjectId.isValid(companyId)) return res.status(400).json({ message: "Company ID is invalid." });
  if (!statuses.includes(status)) return res.status(400).json({ message: "Application status is invalid." });
  if (role !== undefined && (!String(role).trim() || String(role).trim().length > 120)) return res.status(400).json({ message: "Role must be between 1 and 120 characters." });
  if (jobUrl && !/^https?:\/\//i.test(jobUrl)) return res.status(400).json({ message: "Job URL must be a valid http(s) URL." });
  const dates = [interviewAt, nextFollowUpAt].filter(Boolean);
  if (dates.some(date => Number.isNaN(new Date(date).getTime()))) return res.status(400).json({ message: "Application date is invalid." });

  const company = await Company.findById(companyId).select("_id");
  if (!company) return res.status(404).json({ message: "Company not found." });
  let application = await JobApplication.findOne({ user: req.user._id, company: company._id });
  if (!application) {
    application = new JobApplication({
      user: req.user._id,
      company: company._id,
      status,
      statusHistory: [{ status }]
    });
  } else if (application.status !== status) {
    application.status = status;
    application.statusHistory.push({ status, changedAt: new Date() });
  }
  if (role !== undefined) application.role = role;
  if (jobUrl !== undefined) application.jobUrl = jobUrl;
  if (privateNotes !== undefined) application.privateNotes = String(privateNotes).slice(0, 3000);
  if (interviewAt !== undefined) application.interviewAt = interviewAt ? new Date(interviewAt) : undefined;
  if (nextFollowUpAt !== undefined) application.nextFollowUpAt = nextFollowUpAt ? new Date(nextFollowUpAt) : undefined;
  if (status !== "Interested" && status !== "Withdrawn" && !application.appliedAt) application.appliedAt = new Date();
  await application.save();
  await application.populate("company", "name industry website careersPage");
  res.json(application);
}

export async function deleteApplication(req, res) {
  if (!mongoose.Types.ObjectId.isValid(req.params.companyId)) return res.status(400).json({ message: "Company ID is invalid." });
  await JobApplication.deleteOne({ user: req.user._id, company: req.params.companyId });
  res.json({ message: "Application tracking removed." });
}
