import { Router } from "express";
import { env } from "../../../config/env.js";
import { GetTicketUseCase } from "../../../application/use-cases/get-ticket.use-case.js";
import { ListTicketsUseCase } from "../../../application/use-cases/list-tickets.use-case.js";
import { TriageTicketUseCase } from "../../../application/use-cases/triage-ticket.use-case.js";
import { prisma } from "../../database/prisma.js";
import { PrismaTicketRepository } from "../../database/repositories/prisma-ticket.repository.js";
import { GeminiGateway } from "../../gateways/gemini.gateway.js";
import { JevGateway } from "../../gateways/jev.gateway.js";
import { TicketController } from "../controllers/ticket.controller.js";

const ticketRepository = new PrismaTicketRepository(prisma);
const ticketController = new TicketController(
  new TriageTicketUseCase(
    ticketRepository,
    new GeminiGateway(env.GEMINI_API_KEY, env.GEMINI_MODEL),
    new JevGateway(env.JEV_API_KEY),
  ),
  new ListTicketsUseCase(ticketRepository),
  new GetTicketUseCase(ticketRepository),
);

export const ticketRouter = Router();

ticketRouter.post("/", (req, res) => ticketController.create(req, res));
ticketRouter.get("/", (req, res) => ticketController.list(req, res));
ticketRouter.get("/:id", (req, res) => ticketController.show(req, res));
