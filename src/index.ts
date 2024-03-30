import { Elysia } from "elysia";
import { swagger } from "@elysiajs/swagger";
import Logger from "./libs/Logger";
import { connect } from "./database/mongo";
import * as config from "../config.json";
import { getRouter } from "./libs/RouteLoader";

// Database connection
connect(config.srv);

// Elysia API
export const api = new Elysia()
.use(swagger())
.use(getRouter(`/players/:uuid`, __dirname))
.onStart(() => Logger.info(`Elysia listening on port ${config.port}!`))
.listen(config.port);