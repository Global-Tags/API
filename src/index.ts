import { Elysia } from "elysia";
import Logger from "./libs/Logger";
import * as config from "../config.json";
import banRoute from "./routes/ban";
import iconRoute from "./routes/icon";
import positionRoute from "./routes/position";
import reportRoute from "./routes/report";
import rootRoute from "./routes/root";
import { connect } from "./database/mongo";

// Database connection
connect(config.srv);

// Elysia API
export const api = new Elysia({
    prefix: "/players/:uuid"
})
.use(banRoute)
.use(iconRoute)
.use(positionRoute)
.use(reportRoute)
.use(rootRoute)
.onStart(() => Logger.info(`Elysia listening on port ${config.port}!`))
.listen(config.port);