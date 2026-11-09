import { Router } from "express";
import {
  createCustomRoadmap, createRoadmapDay, createRoadmapTask, deleteCustomRoadmap,
  deleteRoadmapDay, deleteRoadmapTask, listCustomRoadmaps, toggleRoadmapTask,
  updateCustomRoadmap, updateRoadmapDay, updateRoadmapTask
} from "../controllers/customRoadmapController.js";
import { protect } from "../middleware/auth.js";

const router = Router();
router.use(protect);
router.get("/", listCustomRoadmaps);
router.post("/", createCustomRoadmap);
router.patch("/:roadmapId", updateCustomRoadmap);
router.delete("/:roadmapId", deleteCustomRoadmap);
router.post("/:roadmapId/days", createRoadmapDay);
router.patch("/:roadmapId/days/:dayId", updateRoadmapDay);
router.delete("/:roadmapId/days/:dayId", deleteRoadmapDay);
router.post("/:roadmapId/days/:dayId/tasks", createRoadmapTask);
router.patch("/:roadmapId/days/:dayId/tasks/:taskId", updateRoadmapTask);
router.delete("/:roadmapId/days/:dayId/tasks/:taskId", deleteRoadmapTask);
router.patch("/:roadmapId/days/:dayId/tasks/:taskId/progress", toggleRoadmapTask);
export default router;
