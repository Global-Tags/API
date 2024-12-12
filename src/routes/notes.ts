import Elysia, { t } from "elysia";
import players, { Permission } from "../database/schemas/players";
import fetchI18n from "../middleware/FetchI18n";
import { ModLogType, NotificationType, sendMessage } from "../libs/DiscordNotifier";
import getAuthProvider from "../middleware/GetAuthProvider";
import { formatUUID } from "./root";
import { config } from "../libs/Config";

const { validation } = config;

export default new Elysia({
    prefix: `/notes`
}).use(fetchI18n).use(getAuthProvider).get(`/`, async ({ error, params, headers, i18n, provider }) => { // Get notes
    if(!provider) return error(401, { error: i18n('error.malformedAuthHeader') });
    const uuid = params.uuid.replaceAll(`-`, ``);
    const { authorization } = headers;
    const session = await provider.getSession(authorization, uuid);
    if(!session.hasPermission(Permission.ManageNotes)) return error(403, { error: i18n(`error.notAllowed`) });

    const player = await players.findOne({ uuid });
    if(!player) return error(404, { error: i18n(`error.playerNotFound`) });

    return player.notes.map((note) => ({
        id: note.id,
        text: note.text,
        author: formatUUID(note.author),
        createdAt: note.createdAt.getTime()
    }));
}, {
    detail: {
        tags: ['Admin'],
        description: `Get all notes of a player`
    },
    response: {
        200: t.Array(t.Object({ id: t.String(), text: t.String(), author: t.String(), createdAt: t.Number() }), { description: `The notes of the player.` }),
        401: t.Object({ error: t.String() }, { description: "You've passed a malformed authorization header." }),
        403: t.Object({ error: t.String() }, { description: "You're not allowed to manage notes." }),
        404: t.Object({ error: t.String() }, { description: "The player you tried to get the notes of was not found." })
    },
    params: t.Object({ uuid: t.String({ description: 'The UUID of the player you want to get the notes of.' }) }),
    headers: t.Object({ authorization: t.String({ error: `error.notAllowed`, description: `Your LabyConnect JWT` }) }, { error: `error.notAllowed` })
}).get(`/:id`, async ({ error, params, headers, i18n, body, provider }) => { // Get specific note
    if(!provider) return error(401, { error: i18n('error.malformedAuthHeader') });
    const uuid = params.uuid.replaceAll(`-`, ``);
    const { authorization } = headers;
    const session = await provider.getSession(authorization, uuid);
    if(!session.hasPermission(Permission.ManageNotes)) return error(403, { error: i18n(`error.notAllowed`) });

    const player = await players.findOne({ uuid });
    if(!player) return error(404, { error: i18n(`error.playerNotFound`) });
    const { id } = params;

    const note = player.notes.find((note) => note.id == id);
    if(!note) return error(404, { error: i18n(`notes.delete.not_found`) });

    return {
        id: note.id,
        text: note.text,
        author: formatUUID(note.author),
        createdAt: note.createdAt.getTime()
    };
}, {
    detail: {
        tags: ['Admin'],
        description: `Get a specific note from a player`
    },
    response: {
        200: t.Object({ id: t.String(), text: t.String(), author: t.String(), createdAt: t.Number() }, { description: 'The note info' }),
        401: t.Object({ error: t.String() }, { description: "You've passed a malformed authorization header." }),
        403: t.Object({ error: t.String() }, { description: "You're not allowed to manage notes." }),
        404: t.Object({ error: t.String() }, { description: "The player or the note was not found." })
    },
    params: t.Object({ uuid: t.String({ description: 'The UUID of the player you want to get the note of.' }), id: t.String({ description: 'The ID of the note you want to get.' }) }),
    headers: t.Object({ authorization: t.String({ error: `error.notAllowed`, description: `Your LabyConnect JWT` }) }, { error: `error.notAllowed` })
}).post(`/`, async ({ error, params, headers, body, i18n, provider }) => { // Add note to player
    if(!provider) return error(401, { error: i18n('error.malformedAuthHeader') });
    const uuid = params.uuid.replaceAll(`-`, ``);
    const { authorization } = headers;
    const session = await provider.getSession(authorization, uuid);
    if(!session.hasPermission(Permission.ManageNotes)) return error(403, { error: i18n(`error.notAllowed`) });

    const player = await players.findOne({ uuid });
    if(!player) return error(404, { error: i18n(`error.playerNotFound`) });
    const { note } = body;

    player.createNote({ text: note, author: session.uuid! });
    await player.save();

    sendMessage({
        type: NotificationType.ModLog,
        logType: ModLogType.CreateNote,
        uuid: uuid,
        staff: session.uuid || 'Unknown',
        note
    });

    return { message: i18n(`notes.create.success`) };
}, {
    detail: {
        tags: ['Admin'],
        description: `Add a note to a player`
    },
    response: {
        200: t.Object({ message: t.String() }, { description: 'The note was successfully added.' }),
        401: t.Object({ error: t.String() }, { description: "You've passed a malformed authorization header." }),
        403: t.Object({ error: t.String() }, { description: "You're not allowed to manage notes." }),
        404: t.Object({ error: t.String() }, { description: "The player you tried to add a note to was not found." })
    },
    body: t.Object({ note: t.String({ maxLength: validation.notes.maxLength, error: `note.create.max_length;;[["max", "${validation.notes.maxLength}"]]` }) }, { error: `error.invalidBody`, additionalProperties: true }),
    params: t.Object({ uuid: t.String({ description: 'The UUID of the player you want to add a note to.' }) }),
    headers: t.Object({ authorization: t.String({ error: `error.notAllowed`, description: `Your LabyConnect JWT` }) }, { error: `error.notAllowed` })
}).delete(`/:id`, async ({ error, params, headers, i18n, body, provider }) => { // Delete note
    if(!provider) return error(401, { error: i18n('error.malformedAuthHeader') });
    const uuid = params.uuid.replaceAll(`-`, ``);
    const { authorization } = headers;
    const session = await provider.getSession(authorization, uuid);
    if(!session.hasPermission(Permission.ManageNotes)) return error(403, { error: i18n(`error.notAllowed`) });

    const player = await players.findOne({ uuid });
    if(!player) return error(404, { error: i18n(`error.playerNotFound`) });
    const { id } = params;

    const note = player.notes.find((note) => note.id == id);
    if(!note) return error(404, { error: i18n(`notes.delete.not_found`) });

    player.deleteNote(note.id);
    await player.save();
    sendMessage({
        type: NotificationType.ModLog,
        logType: ModLogType.DeleteNote,
        uuid: uuid,
        staff: session.uuid || 'Unknown',
        note: note.text
    });

    return { message: i18n(`notes.delete.success`) };
}, {
    detail: {
        tags: ['Admin'],
        description: `Delete a note from a player`
    },
    response: {
        200: t.Object({ message: t.String() }, { description: 'The note was successfully deleted.' }),
        401: t.Object({ error: t.String() }, { description: "You've passed a malformed authorization header." }),
        403: t.Object({ error: t.String() }, { description: "You're not allowed to manage notes." }),
        404: t.Object({ error: t.String() }, { description: "The player or the note was not found." })
    },
    params: t.Object({ uuid: t.String({ description: 'The UUID of the player you want to delete the note of.' }), id: t.String({ description: 'The ID of the note you want to delete.' }) }),
    headers: t.Object({ authorization: t.String({ error: `error.notAllowed`, description: `Your LabyConnect JWT` }) }, { error: `error.notAllowed` })
});