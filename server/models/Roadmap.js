import mongoose from "mongoose";

const resourceSchema = new mongoose.Schema({
  label: { type: String, trim: true, maxlength: 120, default: "" },
  url: { type: String, trim: true, maxlength: 2048, default: "" }
}, { _id: false });

const topicSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, trim: true, maxlength: 1000, default: "" },
  resources: { type: [resourceSchema], default: [] }
});

const subjectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  topics: { type: [topicSchema], default: [] }
});

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 180 },
  description: { type: String, trim: true, maxlength: 2000, default: "" },
  estimatedMinutes: { type: Number, min: 0, max: 1440, default: 30 },
  priority: { type: String, enum: ["Low", "Medium", "High"], default: "Medium" },
  difficulty: { type: String, enum: ["Beginner", "Intermediate", "Advanced"], default: "Beginner" },
  notes: { type: String, trim: true, maxlength: 3000, default: "" },
  xp: { type: Number, min: 0, max: 100, default: 5 },
  problems: [{ type: mongoose.Schema.Types.ObjectId, ref: "Problem" }]
}, { timestamps: true });

const daySchema = new mongoose.Schema({
  dayNumber: { type: Number, required: true, min: 1, max: 1000 },
  title: { type: String, required: true, trim: true, maxlength: 180 },
  subjects: { type: [subjectSchema], default: [] },
  tasks: { type: [taskSchema], default: [] },
  notes: { type: String, trim: true, maxlength: 3000, default: "" },
  revisionItems: [{ type: String, trim: true, maxlength: 300 }]
}, { timestamps: true });

const roadmapSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, trim: true, maxlength: 2000, default: "" },
  startDate: { type: Date, required: true },
  duration: { type: Number, required: true, min: 1, max: 730 },
  targetRole: { type: String, trim: true, maxlength: 100, default: "" },
  difficulty: { type: String, enum: ["Beginner", "Intermediate", "Advanced"], default: "Beginner" },
  dailyStudyHours: { type: Number, min: 0.25, max: 24, default: 2 },
  visibility: { type: String, enum: ["Private", "Public"], default: "Private" },
  days: { type: [daySchema], default: [] }
}, { timestamps: true });

roadmapSchema.index({ owner: 1, updatedAt: -1 });
export default mongoose.model("Roadmap", roadmapSchema);
