import { Router } from "express";
import {
  shareSavedAgendaController,
  shareFullAgendaController,
} from "../controllers/agendaShare.controller.js";
import { agendaShareRateLimit } from "../middlewares/agendaShareRateLimit.middleware.js";
import { validateAgendaShareRequestMiddleware } from "../utils/agendaShare.validation.js";


const router = Router();


router.post(
  "/saved",
  validateAgendaShareRequestMiddleware("saved"),
  agendaShareRateLimit("saved"),
  shareSavedAgendaController,
);


router.post(
  "/full",
  validateAgendaShareRequestMiddleware("full"),
  agendaShareRateLimit("full"),
  shareFullAgendaController,
);


export default router;
