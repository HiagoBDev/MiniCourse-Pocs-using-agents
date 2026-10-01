import { Router } from "express";
import { HealthController } from "../controllers/health.controller.js";

const healthController = new HealthController();

export const healthRouter = Router();

healthRouter.get("/", (req, res) => healthController.handle(req, res));
