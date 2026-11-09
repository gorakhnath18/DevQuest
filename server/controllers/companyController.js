import Company from "../models/Company.js";

export async function listCompanies(req, res) {
  const query = String(req.query.q || "").trim();
  const industry = String(req.query.industry || "").trim();
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
  const filter = {};

  if (query) {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { name: { $regex: escaped, $options: "i" } },
      { industry: { $regex: escaped, $options: "i" } }
    ];
  }
  if (industry) filter.industry = industry;

  const [items, total, industries] = await Promise.all([
    Company.find(filter).select("-lastVerifiedAt").sort({ name: 1 }).skip((page - 1) * limit).limit(limit).lean(),
    Company.countDocuments(filter),
    Company.distinct("industry")
  ]);
  res.json({ items, page, limit, total, industries: industries.sort() });
}
