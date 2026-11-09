import mongoose from "mongoose";

const roadmapProgressSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  day: { type: mongoose.Schema.Types.ObjectId, ref: "RoadmapDay", required: true },
  completedTasks: [{ type: mongoose.Schema.Types.ObjectId }],
  completed: { type: Boolean, default: false },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

roadmapProgressSchema.index({ user: 1, day: 1 }, { unique: true });
export default mongoose.model("RoadmapProgress", roadmapProgressSchema);
