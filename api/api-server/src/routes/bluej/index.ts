import { Router, type IRouter } from "express";
import chatRouter from "./chat.js";
import ttsRouter from "./tts.js";
import sttRouter from "./stt.js";
import progressRouter from "./progress.js";
import downloadRouter from "./download.js";
import simulateRouter from "./simulate.js";
import optimizeRouter from "./optimize.js";
import diagnosticRouter from "./diagnostic.js";
import githubRouter from "./github.js";
import executeRouter from "./execute.js";
import unlockRouter from "./unlock.js";
import workspaceRouter from "./workspace.js";

const router: IRouter = Router();

router.use("/chat", chatRouter);
router.use("/tts", ttsRouter);
router.use("/stt", sttRouter);
router.use("/progress", progressRouter);
router.use("/download", downloadRouter);
router.use("/simulate", simulateRouter);
router.use("/optimize", optimizeRouter);
router.use("/diagnostic", diagnosticRouter);
router.use("/github", githubRouter);
router.use("/execute", executeRouter);
router.use("/unlock", unlockRouter);
router.use("/workspace", workspaceRouter);

export default router;
