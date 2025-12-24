import type { RequestHandler } from "express";
import express from "express";
import teleportController from "../controllers/teleport.controller";

const router = express.Router();

router.post("/", teleportController.create as RequestHandler);
router.get("/", teleportController.get as RequestHandler);
router.put("/", teleportController.update as RequestHandler);

export default router;
