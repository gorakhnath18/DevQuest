import { Router } from "express";
import { listCompanies } from "../controllers/companyController.js";
import { protect } from "../middleware/auth.js";

const router = Router();
router.use(protect);
router.get("/", listCompanies);
export default router;
