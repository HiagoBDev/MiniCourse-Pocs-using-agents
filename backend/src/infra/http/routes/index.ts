import { Router } from "express";
import { healthRouter } from "./health.routes.js";
import { ticketRouter } from "./ticket.routes.js";

export const routes = Router();

routes.use("/health", healthRouter);
routes.use("/tickets", ticketRouter);
