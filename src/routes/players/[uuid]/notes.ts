import { t } from "elysia";
import { ModLogType, sendModLogMessage } from "../../../libs/discord-notifier";
import { Permission } from "../../../types/Permission";
import { formatUUID, stripUUID } from "../../../libs/game-profiles";
import { ElysiaApp } from "../../..";
import { Player } from "../../../database/schemas/Player";
import { tResponseBody, tHeaders, tParams, tRequestBody, tSchema } from "../../../libs/models";
import { DocumentationCategory } from "../../../types/DocumentationCategory";

export default (app: ElysiaApp) => app.get('/', async ({ session, params, i18n, status }) => { // Get notes
    if(!session?.player?.hasPermission(Permission.ViewNotes)) return status(403, { error: i18n('$.error.notAllowed') });

    const player = await Player.findOne({ uuid: stripUUID(params.uuid) });
    if(!player) return status(404, { error: i18n('$.error.playerNotFound') });

    return player.notes.map((note) => ({
        id: note.id,
        text: note.content,
        author: formatUUID(note.author),
        created_at: note.created_at.getTime()
    }));
}, {
    detail: {
        tags: [DocumentationCategory.Notes],
        description: 'Get all player notes'
    },
    response: {
        200: t.Array(tSchema.Note, { description: 'A note list' }),
        403: tResponseBody.Error,
        404: tResponseBody.Error,
    },
    params: tParams.uuid,
    headers: tHeaders
}).get('/:id', async ({ session, params: { uuid, id }, i18n, status }) => { // Get specific note
    if(!session?.player?.hasPermission(Permission.ViewNotes)) return status(403, { error: i18n('$.error.notAllowed') });

    const player = await Player.findOne({ uuid: stripUUID(uuid) });
    if(!player) return status(404, { error: i18n('$.error.playerNotFound') });

    const note = player.notes.find((note) => note.id == id);
    if(!note) return status(404, { error: i18n('$.notes.delete.not_found') });

    return {
        id: note.id,
        text: note.content,
        author: formatUUID(note.author),
        created_at: note.created_at.getTime()
    };
}, {
    detail: {
        tags: [DocumentationCategory.Notes],
        description: 'Get a specific player note'
    },
    response: {
        200: tSchema.Note,
        403: tResponseBody.Error,
        404: tResponseBody.Error,
    },
    params: tParams.uuidAndApiKeyId,
    headers: tHeaders
}).post('/', async ({ session, body: { content }, params, i18n, status }) => { // Add note to player
    if(!session?.player?.hasPermission(Permission.CreateNotes)) return status(403, { error: i18n('$.error.notAllowed') });
    const uuid = stripUUID(params.uuid);

    const player = await Player.findOne({ uuid });
    if(!player) return status(404, { error: i18n('$.error.playerNotFound') });

    const note = player.createNote({ content, author: session.uuid! });
    await player.save();

    sendModLogMessage({
        logType: ModLogType.CreateNote,
        staff: await session.player.getGameProfile(),
        user: await player.getGameProfile(),
        discord: false,
        note: content
    });

    return status(201, {
        id: note.id,
        text: note.content,
        author: formatUUID(note.author),
        created_at: note.created_at.getTime()
    });
}, {
    detail: {
        tags: [DocumentationCategory.Notes],
        description: 'Create a new player note'
    },
    response: {
        201: tSchema.Note,
        403: tResponseBody.Error,
        404: tResponseBody.Error,
    },
    body: tRequestBody.Note,
    params: tParams.uuid,
    headers: tHeaders
}).delete('/:id', async ({ session, params: { uuid, id }, i18n, status }) => { // Delete note
    if(!session?.player?.hasPermission(Permission.DeleteNotes)) return status(403, { error: i18n('$.error.notAllowed') });

    const player = await Player.findOne({ uuid: stripUUID(uuid) });
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
        note: note.content
    });

    return { message: i18n('$.notes.delete.success') };
}, {
    detail: {
        tags: [DocumentationCategory.Notes],
        description: 'Delete a specific player note'
    },
    response: {
        200: tResponseBody.Message,
        403: tResponseBody.Error,
        404: tResponseBody.Error,
    },
    params: tParams.uuidAndApiKeyId,
    headers: tHeaders
});