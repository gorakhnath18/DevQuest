import { Router } from "express";
import { deleteApplication, listApplications, upsertApplication } from "../controllers/applicationController.js";
import { protect } from "../middleware/auth.js";

const router = Router();
router.use(protect);
router.get("/", listApplications);
router.patch("/:companyId", upsertApplication);
router.delete("/:companyId", deleteApplication);
export default router;
