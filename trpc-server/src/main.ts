import { createHTTPServer } from "@trpc/server/adapters/standalone";
import { log } from "./log";
import { migrate } from "./db";
import { appRouter } from "./router";
import { authenticate } from "./auth";

await migrate();

const httpServer = createHTTPServer({
    router: appRouter,
    createContext: async ({ req, res }) => {
        const auth = await authenticate(req);
        return { auth };
    },
    middleware: (req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Request-Method', '*');
        res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET');
        res.setHeader('Access-Control-Allow-Headers', '*');

        if (req.method === 'OPTIONS') {
            res.writeHead(200).end();
            return;
        }

        next();
    },
});

httpServer.listen(4321, () => log('Listening on port 4321'));


