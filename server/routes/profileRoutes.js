import { Router } from "express";
import {
  createRoadmapInvite,
  getRoadmapInvite,
  listRoadmapContributors,
  myStats,
  publicProfile,
  receivedRoadmapInvites,
  respondToRoadmapInvite,
  searchProfiles,
  sharedRoadmapOverview
} from "../controllers/profileController.js";
import { protect } from "../middleware/auth.js";
const router = Router();
router.get("/search", protect, searchProfiles);
router.get("/me/stats", protect, myStats);
router.get("/invitations", protect, receivedRoadmapInvites);
router.get("/contributors", protect, listRoadmapContributors);
router.post("/:userId/invitations", protect, createRoadmapInvite);
router.get("/invitations/:token", protect, getRoadmapInvite);
router.post("/invitations/:token/:action", protect, respondToRoadmapInvite);
router.get("/:username/shared-overview", protect, sharedRoadmapOverview);
router.get("/:username", protect, publicProfile);
export default router;
