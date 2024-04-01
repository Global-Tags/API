import { PreContext } from "elysia";
import { isConnected } from "../database/mongo";

export default function checkDatabase({ error }: PreContext) {
    if(!isConnected()) return error(503, { error: `The database is not connected. Please try again later!` });
}