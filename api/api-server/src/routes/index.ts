import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import openaiRouter from "./openai/index.js";
import bluejRouter from "./bluej/index.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/openai", openaiRouter);
router.use("/bluej", bluejRouter);

export default router;
