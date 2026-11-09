import mongoose from "mongoose";

const historySchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ["Interested", "Applied", "Assessment", "Interview", "Selected", "Offer", "Accepted", "Rejected", "Withdrawn"],
    required: true
  },
  changedAt: { type: Date, default: Date.now }
}, { _id: false });

const jobApplicationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
  role: { type: String, trim: true, maxlength: 120, default: "Software Engineer" },
  jobUrl: { type: String, trim: true, maxlength: 2048, default: "" },
  status: {
    type: String,
    enum: ["Interested", "Applied", "Assessment", "Interview", "Selected", "Offer", "Accepted", "Rejected", "Withdrawn"],
    default: "Interested"
  },
  appliedAt: Date,
  interviewAt: Date,
  nextFollowUpAt: Date,
  privateNotes: { type: String, trim: true, maxlength: 3000, default: "" },
  statusHistory: { type: [historySchema], default: [] }
}, { timestamps: true });

jobApplicationSchema.index({ user: 1, company: 1 }, { unique: true });
jobApplicationSchema.index({ user: 1, status: 1, updatedAt: -1 });
export default mongoose.model("JobApplication", jobApplicationSchema);
