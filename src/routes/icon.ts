import Elysia, { t } from "elysia";
import players from "../database/schemas/players";
import fetchI18n from "../middleware/fetch-i18n";
import getAuthProvider from "../middleware/get-auth-provider";
import { join } from "path";
import { constantCase, pascalCase, snakeCase } from "change-case";
import { config } from "../libs/config";
import { Permission } from "../types/Permission";
import { GlobalIcon } from "../types/GlobalIcon";

export function getCustomIconUrl(uuid: string, hash: string) {
    return `${config.baseUrl}/players/${uuid}/icon/${hash}`;
}

export default new Elysia({
    prefix: "/icon"
}).use(fetchI18n).use(getAuthProvider).get('/:hash', async ({ error, params, i18n }) => {
    const uuid = params.uuid.replaceAll(`-`, ``);

    const player = await players.findOne({ uuid });
    if(!player) return error(404, { error: i18n(`error.noTag`) });
    if(player.isBanned()) return error(403, { error: i18n(`error.banned`) });

    const file = Bun.file(join('icons', player.uuid, `${params.hash.trim()}.png`));
    if(!(await file.exists())) return error(404, { error: i18n(`error.noIcon`) });

    return file;
}, {
    detail: {
        tags: ['Settings'],
        description: 'Get a custom icon by its owner and its hash.'
    },
    response: {
        200: t.File({ description: `Returns the icon` }),
        403: t.Object({ error: t.String() }, { description: `The player is banned.` }),
        404: t.Object({ error: t.String() }, { description: `The icon was not found.` }),
        422: t.Object({ error: t.String() }, { description: `You're lacking the validation requirements.` }),
        429: t.Object({ error: t.String() }, { description: `You're ratelimited.` }),
        503: t.Object({ error: t.String() }, { description: `Database is not reachable.` })
    },
    params: t.Object({ uuid: t.String({ description: `The uuid of the image owner` }), hash: t.String({ description: 'The image hash' }) })
}).post(`/`, async ({ error, params, headers, body, i18n, provider }) => { // Change icon
    if(!provider) return error(401, { error: i18n('error.malformedAuthHeader') });
    const uuid = params.uuid.replaceAll(`-`, ``);
    const icon = body.icon.trim().toUpperCase();
    const { authorization } = headers;
    const session = await provider.getSession(authorization, uuid);
    if(!session.equal && !session.hasPermission(Permission.ManageTags)) return error(403, { error: i18n(`error.notAllowed`) });

    const player = await players.findOne({ uuid });
    if(!player) return error(404, { error: i18n(`error.noTag`) });
    if(player.isBanned()) return error(403, { error: i18n(`error.banned`) });
    if(snakeCase(icon) == snakeCase(player.icon.name)) return error(400, { error: i18n(`icon.sameIcon`) });

    const isCustomIconDisallowed = constantCase(icon) == constantCase(GlobalIcon[GlobalIcon.Custom]) && !session.hasPermission(Permission.CustomIcon);

    if(!session.hasPermission(Permission.BypassValidation) && (isCustomIconDisallowed || !(pascalCase(icon) in GlobalIcon) || config.validation.icon.blacklist.includes(pascalCase(icon)))) return error(403, { error: i18n(`icon.notAllowed`) });

    player.icon.name = snakeCase(icon);
    await player.save();

    return { message: i18n(`icon.success.${session.equal ? 'self' : 'admin'}`) };
}, {
    detail: {
        tags: ['Settings'],
        description: `Change the icon which is displayed next to your global tag`
    },
    response: {
        200: t.Object({ message: t.String() }, { description: `The icon was successfully changed` }),
        400: t.Object({ error: t.String() }, { description: `You tried chose an icon that you're already using.` }),
        401: t.Object({ error: t.String() }, { description: "You've passed a malformed authorization header." }),
        403: t.Object({ error: t.String() }, { description: `You're banned.` }),
        404: t.Object({ error: t.String() }, { description: `You don't have a tag to change the icon of.` }),
        422: t.Object({ error: t.String() }, { description: `You're lacking the validation requirements.` }),
        429: t.Object({ error: t.String() }, { description: `You're ratelimited.` }),
        503: t.Object({ error: t.String() }, { description: `Database is not reachable.` })
    },
    body: t.Object({ icon: t.String({ error: `error.missingField;;[["field", "icon"]]` }) }, { error: `error.invalidBody`, additionalProperties: true }),
    params: t.Object({ uuid: t.String({ description: `Your UUID` }) }),
    headers: t.Object({ authorization: t.String({ error: `error.notAllowed`, description: `Your LabyConnect JWT` }) }, { error: `error.notAllowed` })
}).post(`/role`, async ({ error, params, headers, body, i18n, provider }) => { // Toggle role icon
    if(!provider) return error(401, { error: i18n('error.malformedAuthHeader') });
    const uuid = params.uuid.replaceAll(`-`, ``);
    const { authorization } = headers;
    const session = await provider.getSession(authorization, uuid);
    if(!session.equal && !session.hasPermission(Permission.ManageTags)) return error(403, { error: i18n(`error.notAllowed`) });

    const player = await players.findOne({ uuid });
    if(!player) return error(404, { error: i18n(`error.noTag`) });
    if(player.isBanned()) return error(403, { error: i18n(`error.banned`) });

    player.hide_role_icon = !player.hide_role_icon;
    await player.save();

    return { message: i18n(`icon.role_icon.success.${player.hide_role_icon ? 'hidden' : 'shown'}`) };
}, {
    detail: {
        tags: ['Settings'],
        description: 'Toggle if your role icon should be shown'
    },
    response: {
        200: t.Object({ message: t.String() }, { description: 'The role icon was successfully toggled' }),
        401: t.Object({ error: t.String() }, { description: "You've passed a malformed authorization header." }),
        403: t.Object({ error: t.String() }, { description: `You're banned.` }),
        404: t.Object({ error: t.String() }, { description: `You don't have a tag.` }),
        422: t.Object({ error: t.String() }, { description: `You're lacking the validation requirements.` }),
        429: t.Object({ error: t.String() }, { description: `You're ratelimited.` }),
        503: t.Object({ error: t.String() }, { description: `Database is not reachable.` })
    },
    params: t.Object({ uuid: t.String({ description: `Your UUID` }) }),
    headers: t.Object({ authorization: t.String({ error: `error.notAllowed`, description: `Your LabyConnect JWT` }) }, { error: `error.notAllowed` })
});