import { t } from "elysia";
import { Permission } from "../../../types/Permission";
import { stripUUID } from "../../../libs/game-profiles";
import { ElysiaApp } from "../../..";
import { Player } from "../../../libs/database/schemas/Player";
import { tResponseBody, tHeaders, tParams, tSchema } from "../../../libs/models";
import { DocumentationCategory } from "../../../types/DocumentationCategory";

export default (app: ElysiaApp) => app.get('/', async ({ session, params, i18n, status }) => { // Get data clears
    if(!session?.player?.hasPermission(Permission.ViewDataClears)) return status(403, { error: i18n('$.error.notAllowed') });

    const player = await Player.findOne({ uuid: stripUUID(params.uuid) }).lean();
    if(!player) return status(404, { error: i18n('$.error.playerNotFound') });

    return player.clears.map((clear) => ({
        current_value: clear.current_value,
        reason: clear.reason,
        type: clear.type,
        staff: clear.staff,
        cleared_at: clear.cleared_at.getTime()
    }));
}, {
    detail: {
        tags: [DocumentationCategory.Tags],
        description: 'View tag and icon clears'
    },
    response: {
        200: t.Array(tSchema.Clear, { description: 'A data clear list' }),
        403: tResponseBody.Error,
        404: tResponseBody.Error,
    },
    params: tParams.uuid,
    headers: tHeaders
});