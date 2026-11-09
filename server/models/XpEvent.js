import mongoose from "mongoose";

const xpEventSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  key: { type: String, required: true },
  points: { type: Number, required: true, min: 0, max: 100 },
  reason: { type: String, required: true }
}, { timestamps: true });

xpEventSchema.index({ user: 1, key: 1 }, { unique: true });
export default mongoose.model("XpEvent", xpEventSchema);
