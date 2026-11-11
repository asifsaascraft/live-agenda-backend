
import express from "express";

import {
  createFaculty,
  getAllFaculties,
  getAllFacultiesWithoutPagination,
  getFacultyById,
  updateFaculty,
  deleteFaculty,
} from "../controllers/facultyController.js";

import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

// All Faculty APIs require Admin authentication.
router.use(protect);

// ==========================================
// CREATE FACULTY
// ==========================================

router.post("/", createFaculty);

// ==========================================
// GET ROUTES
// Keep static routes before /:id
// ==========================================

router.get("/all", getAllFacultiesWithoutPagination);

router.get("/", getAllFaculties);

router.get("/:id", getFacultyById);

// ==========================================
// UPDATE FACULTY
// ==========================================

router.put("/:id", updateFaculty);

// ==========================================
// DELETE FACULTY
// ==========================================

router.delete("/:id", deleteFaculty);

export default router;
