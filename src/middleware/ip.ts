import Elysia from "elysia";
import { config } from "../libs/config";

export default function ip(app: Elysia) {   
    return app.derive({ as: "global" }, ({ request }) => {
        if (!config.proxy.enabled) {
            const server = app.server;
            if (!server) return { ip: '' };
    
            if (!server.requestIP) return { ip: '' };
    
            const socketAddress = server.requestIP(request);
            if (!socketAddress) return { ip: "" };
            return { ip: socketAddress.address };
        }

        return { ip: request.headers.get(config.proxy.ipHeader) || '' };
    });
}
