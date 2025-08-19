import { groupsRouter } from "./routers/groups";
import { projectsRouter } from "./routers/projects";
import { rolesRouter } from "./routers/roles";
import { toolsRouter } from "./routers/tools";
import { usersRouter } from "./routers/users";
import { publicProc, router } from "./trpc";

export const appRouter = router({
  ping: publicProc.query(() => 'pong'),
  users: usersRouter,
  groups: groupsRouter,
  roles: rolesRouter,
  projects: projectsRouter,
  tools: toolsRouter,
});

export type AppRouter = typeof appRouter;
