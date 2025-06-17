import { t } from "elysia";
import players from "../../../database/schemas/players";
import { ModLogType, sendModLogMessage } from "../../../libs/discord-notifier";
import { config } from "../../../libs/config";
import { Permission } from "../../../types/Permission";
import { formatUUID, GameProfile, stripUUID } from "../../../libs/game-profiles";
import { ElysiaApp } from "../../..";

const { validation } = config;

export default (app: ElysiaApp) => app.get('/', async ({ session, params, i18n, status }) => { // Get notes
    if(!session?.player?.hasPermission(Permission.ViewNotes)) return status(403, { error: i18n('$.error.notAllowed') });

    const player = await players.findOne({ uuid: stripUUID(params.uuid) });
    if(!player) return status(404, { error: i18n('$.error.playerNotFound') });

    return player.notes.map((note) => ({
        id: note.id,
        text: note.text,
        author: formatUUID(note.author),
        createdAt: note.createdAt.getTime()
    }));
}, {
    detail: {
        tags: ['Admin'],
        description: 'Returns all player notes'
    },
    response: {
        200: t.Array(t.Object({ id: t.String(), text: t.String(), author: t.String(), createdAt: t.Number() }), { description: 'The notes of the player' }),
        403: t.Object({ error: t.String() }, { description: 'You\'re not allowed to manage notes' }),
        404: t.Object({ error: t.String() }, { description: 'The player was not found' }),
        422: t.Object({ error: t.String() }, { description: 'You\'re lacking the validation requirements' }),
        429: t.Object({ error: t.String() }, { description: 'You\'re ratelimited' }),
        503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
    },
    params: t.Object({ uuid: t.String({ description: 'The player\'s UUID' }) }),
    headers: t.Object({ authorization: t.String({ error: '$.error.notAllowed', description: 'Your authentication token' }) }, { error: '$.error.notAllowed' })
}).get('/:id', async ({ session, params: { uuid, id }, i18n, status }) => { // Get specific note
    if(!session?.player?.hasPermission(Permission.ViewNotes)) return status(403, { error: i18n('$.error.notAllowed') });

    const player = await players.findOne({ uuid: stripUUID(uuid) });
    if(!player) return status(404, { error: i18n('$.error.playerNotFound') });

    const note = player.notes.find((note) => note.id == id);
    if(!note) return status(404, { error: i18n('$.notes.delete.not_found') });

    return {
        id: note.id,
        text: note.text,
        author: formatUUID(note.author),
        createdAt: note.createdAt.getTime()
    };
}, {
    detail: {
        tags: ['Admin'],
        description: 'Returns a specific player note'
    },
    response: {
        200: t.Object({ id: t.String(), text: t.String(), author: t.String(), createdAt: t.Number() }, { description: 'The note info' }),
        403: t.Object({ error: t.String() }, { description: 'You\'re not allowed to manage notes' }),
        404: t.Object({ error: t.String() }, { description: 'The player or the note was not found' }),
        422: t.Object({ error: t.String() }, { description: 'You\'re lacking the validation requirements' }),
        429: t.Object({ error: t.String() }, { description: 'You\'re ratelimited' }),
        503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
    },
    params: t.Object({ uuid: t.String({ description: 'The player\'s UUID' }), id: t.String({ description: 'The note ID' }) }),
    headers: t.Object({ authorization: t.String({ error: '$.error.notAllowed', description: 'Your authentication token' }) }, { error: '$.error.notAllowed' })
}).post('/', async ({ session, body: { note }, params, i18n, status }) => { // Add note to player
    if(!session?.player?.hasPermission(Permission.CreateNotes)) return status(403, { error: i18n('$.error.notAllowed') });
    const uuid = stripUUID(params.uuid);

    const player = await players.findOne({ uuid });
    if(!player) return status(404, { error: i18n('$.error.playerNotFound') });

    player.createNote({ text: note, author: session.uuid! });
    await player.save();

    sendModLogMessage({
        logType: ModLogType.CreateNote,
        staff: await session.player.getGameProfile(),
        user: await player.getGameProfile(),
        discord: false,
        note
    });

    return { message: i18n('$.notes.create.success') };
}, {
    detail: {
        tags: ['Admin'],
        description: 'Creates a player note'
    },
    response: {
        200: t.Object({ message: t.String() }, { description: 'The note was created' }),
        403: t.Object({ error: t.String() }, { description: 'You\'re not allowed to manage notes' }),
        404: t.Object({ error: t.String() }, { description: 'The player was not found' }),
        422: t.Object({ error: t.String() }, { description: 'You\'re lacking the validation requirements' }),
        429: t.Object({ error: t.String() }, { description: 'You\'re ratelimited' }),
        503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
    },
    body: t.Object({ note: t.String({ maxLength: validation.notes.maxLength, error: `$.notes.create.max_length;;[["max", "${validation.notes.maxLength}"]]` }) }, { error: '$.error.invalidBody', additionalProperties: true }),
    params: t.Object({ uuid: t.String({ description: 'The player\'s UUID' }) }),
    headers: t.Object({ authorization: t.String({ error: '$.error.notAllowed', description: 'Your authentication token' }) }, { error: '$.error.notAllowed' })
}).delete('/:id', async ({ session, params: { uuid, id }, i18n, status }) => { // Delete note
    if(!session?.player?.hasPermission(Permission.DeleteNotes)) return status(403, { error: i18n('$.error.notAllowed') });

    const player = await players.findOne({ uuid: stripUUID(uuid) });
    if(!player) return status(404, { error: i18n(`error.playerNotFound`) });

    const note = player.notes.find((note) => note.id == id);
    if(!note) return status(404, { error: i18n(`notes.delete.not_found`) });

    player.deleteNote(note.id);
    await player.save();

    sendModLogMessage({
        logType: ModLogType.DeleteNote,
        staff: await session.player.getGameProfile(),
        user: await player.getGameProfile(),
        discord: false,
        note: note.text
    });

    return { message: i18n('$.notes.delete.success') };
}, {
    detail: {
        tags: ['Admin'],
        description: 'Deletes a specific player note'
    },
    response: {
        200: t.Object({ message: t.String() }, { description: 'The note was deleted' }),
        403: t.Object({ error: t.String() }, { description: 'You\'re not allowed to manage notes' }),
        404: t.Object({ error: t.String() }, { description: 'The player or the note was not found' }),
        422: t.Object({ error: t.String() }, { description: 'You\'re lacking the validation requirements' }),
        429: t.Object({ error: t.String() }, { description: 'You\'re ratelimited' }),
        503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
    },
    params: t.Object({ uuid: t.String({ description: 'The player\'s UUID' }), id: t.String({ description: 'The note ID' }) }),
    headers: t.Object({ authorization: t.String({ error: '$.error.notAllowed', description: 'Your authentication token' }) }, { error: '$.error.notAllowed' })
});