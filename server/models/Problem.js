import mongoose from "mongoose";

const problemSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 180 },
  sourceKey: { type: String, trim: true },
  topic: { type: String, required: true, trim: true, maxlength: 80 },
  pattern: { type: String, default: "", maxlength: 100 },
  difficulty: { type: String, enum: ["Easy", "Medium", "Hard"], required: true },
  platform: { type: String, required: true, maxlength: 60 },
  url: { type: String, required: true, match: /^https?:\/\// },
  archived: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true });

problemSchema.index({ title: "text", topic: "text", pattern: "text" });
problemSchema.index({ sourceKey: 1 }, { unique: true, sparse: true });
export default mongoose.model("Problem", problemSchema);
