import mongoose from "mongoose";

const companySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  industry: { type: String, required: true, trim: true, maxlength: 80 },
  website: { type: String, required: true, match: /^https:\/\// },
  careersPage: { type: String, required: true, match: /^https:\/\// },
  sourceUrl: { type: String, required: true, match: /^https:\/\// }
}, { timestamps: true });

companySchema.index({ industry: 1, name: 1 });
companySchema.index({ name: "text", industry: "text" });
export default mongoose.model("Company", companySchema);
