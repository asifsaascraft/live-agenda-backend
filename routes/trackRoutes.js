
import express from "express";

import {
  createTrack,
  getAllTracks,
  getActiveTracks,
  getAllActiveTracksWithoutPagination,
  getTrackById,
  updateTrack,
  deleteTrack,
} from "../controllers/trackController.js";

import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

// All Track APIs require Admin authentication.
router.use(protect);

// ==========================================
// CREATE TRACK
// ==========================================

router.post("/", createTrack);

// ==========================================
// GET ROUTES
// Keep static routes before /:id
// ==========================================

router.get("/active/all", getAllActiveTracksWithoutPagination);

router.get("/active", getActiveTracks);

router.get("/", getAllTracks);

router.get("/:id", getTrackById);

// ==========================================
// UPDATE TRACK
// ==========================================

router.put("/:id", updateTrack);

// ==========================================
// DELETE TRACK
// ==========================================

router.delete("/:id", deleteTrack);

export default router;
