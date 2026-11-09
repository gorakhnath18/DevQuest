import mongoose from "mongoose";

const roadmapInviteSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  codeHash: { type: String },
  status: { type: String, enum: ["Pending", "Accepted", "Declined"], default: "Pending" },
  acceptedAt: Date
}, { timestamps: true });

roadmapInviteSchema.index({ sender: 1, recipient: 1 }, { unique: true });
roadmapInviteSchema.index({ codeHash: 1 }, { unique: true, sparse: true });
export default mongoose.model("RoadmapInvite", roadmapInviteSchema);
