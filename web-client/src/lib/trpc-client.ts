import type { AppRouter } from "@server/router";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import superjson from 'superjson';

export const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'http://localhost:4321',
      transformer: superjson,
    }),
  ],
});


