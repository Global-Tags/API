import { t } from "elysia";
import players from "../../../database/schemas/players";
import { Permission } from "../../../types/Permission";
import { GlobalPosition } from "../../../types/GlobalPosition";
import { pascalCase, snakeCase } from "change-case";
import { stripUUID } from "../../../libs/game-profiles";
import { ElysiaApp } from "../../..";

export default (app: ElysiaApp) => app.post('/', async ({ session, body: { position }, params, i18n, error }) => { // Change tag position
    if(!session || !session.equal && !session.hasPermission(Permission.ManageTags)) return error(403, { error: i18n('error.notAllowed') });
    if(!(pascalCase(position) in GlobalPosition)) return error(422, { error: i18n('position.invalid') });

    position = snakeCase(position);
    const uuid = stripUUID(params.uuid);
    const player = await players.findOne({ uuid });

    if(player) {
        if(player.isBanned()) return error(403, { error: i18n('error.banned') });
        if(snakeCase(player.position) == position) return error(400, { error: i18n('position.samePosition') });

        player.position = position;
        await player.save();
    } else {
        await players.insertMany({
            uuid,
            position
        });
    }

    return { message: i18n(`position.success.${session.equal ? 'self' : 'admin'}`) };
}, {
    detail: {
        tags: ['Settings'],
        description: 'Changes your GlobalTag position'
    },
    response: {
        200: t.Object({ message: t.String() }, { description: 'The tag position was updated' }),
        400: t.Object({ error: t.String() }, { description: 'You provided an invalid position' }),
        403: t.Object({ error: t.String() }, { description: 'You\'re not allowed to change your tag position' }),
        409: t.Object({ error: t.String() }, { description: 'Your tag is already in that position' }),
        422: t.Object({ error: t.String() }, { description: 'You\'re lacking the validation requirements' }),
        429: t.Object({ error: t.String() }, { description: 'You\'re ratelimited' }),
        503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
    },
    body: t.Object({ position: t.String({ error: 'error.missingField;;[["field", "position"]]' }) }, { error: 'error.invalidBody', additionalProperties: true }),
    params: t.Object({ uuid: t.String({ description: 'Your UUID' }) }),
    headers: t.Object({ authorization: t.String({ error: 'error.notAllowed', description: 'Your authentication token' }) }, { error: 'error.notAllowed' })
});