import { Context, Elysia } from "elysia";
import { swagger } from "@elysiajs/swagger";
import Logger from "./libs/Logger";
import { connect } from "./database/mongo";
import { getRouter } from "./libs/RouteLoader";
import * as config from "../config.json";
import { version } from "../package.json";

// Database connection
connect(config.srv);

// TODO: Implement ratelimiter

// Elysia API
export const api = new Elysia()
.get(`/`, () => ({ version }))
.get(`/ping`, ({ error }: Context) => { return error(204, "") })
.use(swagger())
.use(getRouter(`/players/:uuid`, __dirname))
.onStart(() => Logger.info(`Elysia listening on port ${config.port}!`))
.listen(config.port);