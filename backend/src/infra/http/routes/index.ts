import { Router } from "express";
import { healthRouter } from "./health.routes.js";

export const routes = Router();

routes.use("/health", healthRouter);
