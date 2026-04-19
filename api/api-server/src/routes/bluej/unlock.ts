import { Router, type IRouter } from 'express';

const router: IRouter = Router();
const ADMIN_PASSWORD = 'BruceWayne';

router.post('/', async (req, res) => {
  try {
    const {
      password,
      courseGatePassed,
    } = req.body as { password?: string; courseGatePassed?: boolean };

    if (password === ADMIN_PASSWORD) {
      res.json({
        unlocked: true,
        level: 'admin',
        message: 'Admin override accepted. Autonomous coding suite unlocked inside approved workspaces.',
      });
      return;
    }

    if (courseGatePassed) {
      res.json({
        unlocked: true,
        level: 'course',
        message: 'Course gate confirmed. Guided advanced agent mode is now available.',
      });
      return;
    }

    res.status(403).json({
      unlocked: false,
      level: 'locked',
      message: 'Unlock denied. Complete the course gate or provide the admin password.',
    });
  } catch (error) {
    req.log.error({ error }, 'Unlock error');
    res.status(500).json({ error: 'Unlock failed' });
  }
});

export default router;
