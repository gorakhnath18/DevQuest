import mongoose from "mongoose";

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: "" },
  xp: { type: Number, default: 5, min: 0, max: 100 },
  problems: [{ type: mongoose.Schema.Types.ObjectId, ref: "Problem" }]
}, { _id: true });

const roadmapDaySchema = new mongoose.Schema({
  day: { type: Number, required: true, unique: true, min: 1, max: 120 },
  phase: { type: String, required: true },
  title: { type: String, required: true },
  studyDate: { type: String, default: "" },
  resource: { type: String, default: "" },
  level: { type: String, enum: ["Beginner", "Intermediate", "Advanced"], default: "Beginner" },
  topics: [{ type: String }],
  lesson: { type: String, default: "" },
  tasks: [taskSchema]
}, { timestamps: true });

export default mongoose.model("RoadmapDay", roadmapDaySchema);
