import mongoose from "mongoose";

const progressSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  problem: { type: mongoose.Schema.Types.ObjectId, ref: "Problem", required: true },
  status: { type: String, enum: ["Not Started", "Attempted", "Solved", "Revision Due"], default: "Not Started" },
  notes: { type: String, default: "", maxlength: 3000 },
  attempts: { type: Number, default: 0, min: 0, max: 1000 },
  solvedAt: Date
}, { timestamps: true });

progressSchema.index({ user: 1, problem: 1 }, { unique: true });
export default mongoose.model("ProblemProgress", progressSchema);
