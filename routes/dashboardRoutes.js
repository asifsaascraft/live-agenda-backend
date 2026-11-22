import express from "express";

import { getDashboard } from "../controllers/dashboardController.js";
import {protect} from "../middlewares/authMiddleware.js"

const router = express.Router();

router.use(protect);

router.get("/", getDashboard);

export default router;