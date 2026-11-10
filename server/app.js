import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import authRoutes from "./routes/authRoutes.js";
import roadmapRoutes from "./routes/roadmapRoutes.js";
import problemRoutes from "./routes/problemRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import customRoadmapRoutes from "./routes/customRoadmapRoutes.js";
import companyRoutes from "./routes/companyRoutes.js";
import applicationRoutes from "./routes/applicationRoutes.js";
import { connectDB } from "./config/db.js";

const app = express();
app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json({ limit: "200kb" }));
app.use(morgan("dev"));
app.get("/", (req, res) => res.json({ app: "DEVQUEST API", health: "/api/health" }));
app.use("/api", rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false }));
app.use("/api", async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    next(error);
  }
});
app.get("/api", (req, res) => res.json({ app: "DEVQUEST API", health: "/api/health" }));
app.get("/api/health", (req, res) => res.json({ status: "ok", app: "DEVQUEST API" }));
app.use("/api/auth", authRoutes);
app.use("/api/roadmap", roadmapRoutes);
app.use("/api/roadmaps", customRoadmapRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/problems", problemRoutes);
app.use("/api/profiles", profileRoutes);
app.use((req, res) => res.status(404).json({ message: "Route not found." }));
app.use((err, req, res, next) => {
  console.error(err);
  if (err.name === "ValidationError" || err.name === "CastError") {
    return res.status(400).json({ message: "Request data is invalid." });
  }
  res.status(500).json({ message: "Unexpected server error." });
});
export default app;
