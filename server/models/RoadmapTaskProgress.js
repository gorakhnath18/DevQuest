import mongoose from "mongoose";

const roadmapTaskProgressSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  roadmap: { type: mongoose.Schema.Types.ObjectId, ref: "Roadmap", required: true },
  task: { type: mongoose.Schema.Types.ObjectId, required: true },
  completed: { type: Boolean, default: false },
  completedAt: Date
}, { timestamps: true });

roadmapTaskProgressSchema.index({ user: 1, roadmap: 1, task: 1 }, { unique: true });
export default mongoose.model("RoadmapTaskProgress", roadmapTaskProgressSchema);
