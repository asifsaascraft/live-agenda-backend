
import express from "express";

import {
  createHall,
  getAllHalls,
  getActiveHalls,
  getAllActiveHallsWithoutPagination,
  getHallById,
  updateHall,
  deleteHall,
} from "../controllers/hallController.js";

import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

// All Hall APIs require Admin authentication.
router.use(protect);

// ==========================================
// CREATE HALL
// ==========================================

router.post("/", createHall);

// ==========================================
// GET ROUTES
// Keep static routes before /:id
// ==========================================

router.get("/active/all", getAllActiveHallsWithoutPagination);

router.get("/active", getActiveHalls);

router.get("/", getAllHalls);

router.get("/:id", getHallById);

// ==========================================
// UPDATE HALL
// ==========================================

router.put("/:id", updateHall);

// ==========================================
// DELETE HALL
// ==========================================

router.delete("/:id", deleteHall);

export default router;
