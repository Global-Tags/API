import { t } from "elysia";
import { ElysiaApp } from "..";
import staffCategories, { getNextPosition } from "../database/schemas/staff-categories";
import staffMembers from "../database/schemas/staff-members";
import { formatUUID, GameProfile, stripUUID, uuidRegex } from "../libs/game-profiles";
import { generateSecureCode } from "../libs/crypto";
import { Permission } from "../types/Permission";

export default (app: ElysiaApp) => app.get('/', async () => {
    const categories = await staffCategories.find().sort({ position: 1 }).lean();

    return await Promise.all(
        categories.map(async (category) => {
            const members = await staffMembers.find({ category: category.id }).sort({ joinedAt: 1 }).lean();

            const mappedMembers = await Promise.all(members.map(async (member) => ({
                uuid: member.uuid,
                username: (await GameProfile.getProfileByUUID(member.uuid)).username || 'Failed to load',
                description: member.description || null,
                avatar_url: 'https://example.com/avatar.png', // TODO: Replace with actual avatar URL logic
                joined_at: member.joined_at.getTime()
            })));

            return {
                id: category.id,
                name: category.name,
                members: mappedMembers
            };
        })
    );
}, {
    detail: {
        tags: ['API'],
        description: 'Gets the staff team members'
    },
    response: {
        200: t.Array(t.Object({ id: t.String(), name: t.String(), members: t.Array(t.Object({ uuid: t.String(), username: t.String(), description: t.Union([t.String(), t.Null()]), avatar_url: t.String(), joined_at: t.Integer() })) }), { description: 'The team categories with its members' }),
        503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
    }
}).group('/categories', (app) =>
    app.get('/', async ({ session, i18n, status }) => {
        if(!session?.player?.hasPermission(Permission.ViewStaffCategories)) return status(403, { error: i18n('$.error.notAllowed') });

        return Promise.all((await staffCategories.find().sort({ position: 1 }).lean()).map(async (category) => ({
            id: category.id,
            name: category.name,
            position: category.position,
            members: (await staffMembers.find({ category: category.id }).sort({ joinedAt: 1 }).lean()).length
        })));
    }, {
        detail: {
            tags: ['API'],
            description: 'Gets the staff team categories'
        },
        response: {
            200: t.Array(t.Object({ id: t.String(), name: t.String(), position: t.Integer(), members: t.Integer() }), { description: 'The team categories' }),
            403: t.Object({ error: t.String() }, { description: 'You\'re not allowed to manage staff categories' }),
            503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
        }
    }).get('/:category', async ({ session, params: { category: id }, i18n, status }) => {
        if(!session?.player?.hasPermission(Permission.ViewStaffCategories)) return status(403, { error: i18n('$.error.notAllowed') });

        const category = await staffCategories.findOne({ id }).lean();
        if(!category) return status(404, { error: i18n('$.staff.categories.not_found') });
        const members = await staffMembers.find({ category: category.id }).sort({ joinedAt: 1 }).lean();

        return {
            id: category.id,
            name: category.name,
            position: category.position,
            members: members.length
        };
    }, {
        detail: {
            tags: ['API'],
            description: 'Gets a specific staff team category by ID'
        },
        response: {
            200: t.Object({ id: t.String(), name: t.String(), position: t.Integer(), members: t.Integer() }, { description: 'The team category' }),
            403: t.Object({ error: t.String() }, { description: 'You\'re not allowed to manage staff categories' }),
            404: t.Object({ error: t.String() }, { description: 'Category not found' }),
            503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
        },
        params: t.Object({ category: t.String({ description: 'The category ID' }) }),
        headers: t.Object({ authorization: t.String({ error: '$.error.notAllowed', description: 'Your authentication token' }) }, { error: '$.error.notAllowed' }),
    }).post('/', async ({ session, body: { name }, i18n, status }) => {
        if(!session?.player?.hasPermission(Permission.CreateStaffCategories)) return status(403, { error: i18n('$.error.notAllowed') });

        const category = await staffCategories.insertOne({
            id: generateSecureCode(),
            name: name.trim(),
            position: await getNextPosition()
        });

        return status(201, {
            id: category.id,
            name: category.name,
            position: category.position
        });
    }, {
        detail: {
            tags: ['API'],
            description: 'Creates a new staff team category'
        },
        response: {
            201: t.Object({ id: t.String(), name: t.String(), position: t.Integer() }, { description: 'The created team category' }),
            403: t.Object({ error: t.String() }, { description: 'You\'re not allowed to manage staff categories' }),
            503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
        },
        body: t.Object({
            name: t.String({ minLength: 1, error: '$.error.wrongType;;[["field", "name"], ["type", "string"]]' })
        }, { error: '$.error.invalidBody', additionalProperties: true }),
        headers: t.Object({ authorization: t.String({ error: '$.error.notAllowed', description: 'Your authentication token' }) }, { error: '$.error.notAllowed' })
    }).patch('/:id', async ({ session, body: { name }, params: { id }, i18n, status }) => { // Edit category
        if(!session?.player?.hasPermission(Permission.EditStaffMembers)) return status(403, { error: i18n('$.error.notAllowed') });

        const category = await staffCategories.findOne({ id });
        if(!category) return status(404, { error: i18n('$.staff.categories.not_found') });

        if(name && category.name !== name.trim()) {
            category.name = name.trim();
            await category.save();

            // TODO: Add mod log
        }

        return status(200, {
            id: category.id,
            name: category.name,
            position: category.position
        });
    }, {
        detail: {
            tags: ['API'],
            description: 'Edits an existing staff category'
        },
        response: {
            200: t.Object({ id: t.String(), name: t.String(), position: t.Integer() }, { description: 'The edited team category' }),
            403: t.Object({ error: t.String() }, { description: 'You\'re not allowed to manage staff categories' }),
            404: t.Object({ error: t.String() }, { description: 'Category not found' }),
            503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
        },
        body: t.Object({
            name: t.Optional(t.String({ error: '$.error.wrongType;;[["field", "name"], ["type", "string"]]' }))
        }, { error: '$.error.invalidBody', additionalProperties: true }),
        params: t.Object({ id: t.String({ description: 'The category ID' }) }),
        headers: t.Object({ authorization: t.String({ error: '$.error.notAllowed', description: 'Your authentication token' }) }, { error: '$.error.notAllowed' })
    }) // TODO: Implement route to patch all categories at once
    .delete('/:category', async ({ session, params: { category: id }, i18n, status }) => {
        if(!session?.player?.hasPermission(Permission.DeleteStaffCategories)) return status(403, { error: i18n('$.error.notAllowed') });

        const category = await staffCategories.findOne({ id });
        if(!category) return status(404, { error: i18n('$.staff.categories.not_found') });

        await category.deleteOne();

        return { message: i18n('$.staff.categories.delete.success').replace('<name>', category.name) };
    }, {
        detail: {
            tags: ['API'],
            description: 'Deletes a specific staff team category by ID'
        },
        response: {
            200: t.Object({ message: t.String() }, { description: 'The success message' }),
            403: t.Object({ error: t.String() }, { description: 'You\'re not allowed to manage staff categories' }),
            404: t.Object({ error: t.String() }, { description: 'Category not found' }),
            503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
        },
        params: t.Object({ category: t.String({ description: 'The category ID' }) }),
        headers: t.Object({ authorization: t.String({ error: '$.error.notAllowed', description: 'Your authentication token' }) }, { error: '$.error.notAllowed' }),
    })
).group('/members', (app) =>
    app.get('/', async ({ session, i18n, status }) => {
        if(!session?.player?.hasPermission(Permission.ViewStaffMembers)) return status(403, { error: i18n('$.error.notAllowed') });

        return Promise.all((await staffMembers.find().sort({ joinedAt: 1 }).lean()).map(async member => ({
            uuid: formatUUID(member.uuid),
            username: (await GameProfile.getProfileByUUID(member.uuid)).username || 'Unknown',
            category: member.category,
            description: member.description || null,
            joined_at: member.joined_at.getTime()
        })));
    }, {
        detail: {
            tags: ['API'],
            description: 'Gets all staff team members'
        },
        response: {
            200: t.Array(t.Object({ uuid: t.String(), username: t.String(), category: t.String(), description: t.Union([t.String(), t.Null()]), joined_at: t.Integer() }), { description: 'The team members' }),
            403: t.Object({ error: t.String() }, { description: 'You\'re not allowed to manage staff members' }),
            503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
        }
    }).get('/:uuid', async ({ session, params: { uuid }, i18n, status }) => {
        if(!session?.player?.hasPermission(Permission.ViewStaffMembers)) return status(403, { error: i18n('$.error.notAllowed') });

        const member = await staffMembers.findOne({ uuid: stripUUID(uuid) });
        if(!member) return status(404, { error: i18n('$.staff.members.not_found') });

        return {
            uuid: formatUUID(member.uuid),
            username: (await GameProfile.getProfileByUUID(member.uuid)).username || 'Unknown',
            category: member.category,
            description: member.description || null,
            joined_at: member.joined_at.getTime()
        };
    }, {
        detail: {
            tags: ['API'],
            description: 'Gets a specific staff team member by UUID'
        },
        response: {
            200: t.Object({ uuid: t.String(), username: t.String(), category: t.String(), description: t.Union([t.String(), t.Null()]), joined_at: t.Integer() }, { description: 'The team member' }),
            403: t.Object({ error: t.String() }, { description: 'You\'re not allowed to manage staff members' }),
            404: t.Object({ error: t.String() }, { description: 'Member not found' }),
            503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
        },
        params: t.Object({ uuid: t.String({ description: 'The member UUID' }) }),
        headers: t.Object({ authorization: t.String({ error: '$.error.notAllowed', description: 'Your authentication token' }) }, { error: '$.error.notAllowed' }),
    }).post('/', async ({ session, body: { uuid, category, description }, i18n, status }) => {
        if(!session?.player?.hasPermission(Permission.CreateStaffMembers)) return status(403, { error: i18n('$.error.notAllowed') });

        uuid = stripUUID(uuid.trim());

        if(!uuidRegex.test(uuid)) return status(400, { error: i18n('$.staff.members.invalid_uuid') });

        const existingMember = await staffMembers.findOne({ uuid });
        if(existingMember) return status(409, { error: i18n('$.staff.members.already_exists') });

        if(!(await staffCategories.exists({ id: category }))) return status(404, { error: i18n('$.staff.categories.not_found') });

        const joinedAt = new Date();
        joinedAt.setHours(0, 0, 0, 0);

        const newMember = await staffMembers.insertOne({
            uuid: stripUUID(uuid.trim()),
            category,
            description: description?.trim() || null,
            joined_at: joinedAt
        });

        return status(201, {
            uuid: formatUUID(newMember.uuid),
            username: (await GameProfile.getProfileByUUID(newMember.uuid)).username || 'Unknown',
            category: newMember.category,
            description: newMember.description || null,
            joined_at: newMember.joined_at.getTime()
        });
    }, {
        detail: {
            tags: ['API'],
            description: 'Adds a new staff team member'
        },
        response: {
            201: t.Object({ uuid: t.String(), username: t.String(), category: t.String(), description: t.Union([t.String(), t.Null()]), joined_at: t.Integer() }, { description: 'The created team member' }),
            400: t.Object({ error: t.String() }, { description: 'An invalid UUID was passed' }),
            403: t.Object({ error: t.String() }, { description: 'You\'re not allowed to manage staff members' }),
            404: t.Object({ error: t.String() }, { description: 'Category not found' }),
            409: t.Object({ error: t.String() }, { description: 'Member already exists' }),
            503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
        },
        body: t.Object({
            uuid: t.String({ error: '$.error.wrongType;;[["field", "uuid"], ["type", "string"]]' }),
            category: t.String({ error: '$.error.wrongType;;[["field", "category"], ["type", "string"]]' }),
            description: t.Union([t.String(), t.Null()], { error: '$.error.wrongType;;[["field", "description"], ["type", "string"]]' })
        }, { error: '$.error.invalidBody', additionalProperties: true }),
        headers: t.Object({ authorization: t.String({ error: '$.error.notAllowed', description: 'Your authentication token' }) }, { error: '$.error.notAllowed' })
    }).patch('/:uuid', async ({ session, body: { category, description }, params: { uuid }, i18n, status }) => {
        if(!session?.player?.hasPermission(Permission.EditStaffMembers)) return status(403, { error: i18n('$.error.notAllowed') });

        const member = await staffMembers.findOne({ uuid: stripUUID(uuid) });
        if(!member) return status(404, { error: i18n('$.staff.members.not_found') });

        let updated = false;
        if(category !== undefined && member.category !== category) {
            if(!(await staffCategories.exists({ id: category }))) return status(404, { error: i18n('$.staff.categories.not_found') });
            member.category = category;
            updated = true;
        }
        if(description !== undefined && member.description !== description?.trim()) {
            member.description = description?.trim() || null;
            updated = true;
        }
        if(updated) member.save(); // TODO: Add mod log

        return status(200, {
            uuid: formatUUID(member.uuid),
            username: (await GameProfile.getProfileByUUID(member.uuid)).username || 'Unknown',
            category: member.category,
            description: member.description || null,
            joined_at: member.joined_at.getTime()
        });
    }, {
        detail: {
            tags: ['API'],
            description: 'Edits an existing staff team member'
        },
        response: {
            200: t.Object({ uuid: t.String(), username: t.String(), category: t.String(), description: t.Union([t.String(), t.Null()]), joined_at: t.Integer() }, { description: 'The edited team member' }),
            403: t.Object({ error: t.String() }, { description: 'You\'re not allowed to manage staff members' }),
            404: t.Object({ error: t.String() }, { description: 'Mmeber or category not found' }),
            503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
        },
        body: t.Object({
            category: t.Optional(t.String({ error: '$.error.wrongType;;[["field", "category"], ["type", "string"]]' })),
            description: t.Optional(t.Union([t.String(), t.Null()], { error: '$.error.wrongType;;[["field", "description"], ["type", "string"]]' }))
        }, { error: 'error.invalidBody', additionalProperties: true }),
        params: t.Object({ uuid: t.String({ description: 'The member UUID' }) }),
        headers: t.Object({ authorization: t.String({ error: '$.error.notAllowed', description: 'Your authentication token' }) }, { error: '$.error.notAllowed' })
    }).delete('/:uuid', async ({ session, params: { uuid }, i18n, status }) => {
        if(!session?.player?.hasPermission(Permission.DeleteStaffMembers)) return status(403, { error: i18n('$.error.notAllowed') });

        const member = await staffMembers.findOne({ uuid: stripUUID(uuid) });
        if(!member) return status(404, { error: i18n('$.staff.members.not_found') });

        await member.deleteOne();

        return { message: i18n('$.staff.members.delete.success').replace('<username>', (await GameProfile.getProfileByUUID(uuid)).username || 'Unknown') };
    }, {
        detail: {
            tags: ['API'],
            description: 'Deletes a specific staff team member by UUID'
        },
        response: {
            200: t.Object({ message: t.String() }, { description: 'The success message' }),
            403: t.Object({ error: t.String() }, { description: 'You\'re not allowed to manage staff members' }),
            404: t.Object({ error: t.String() }, { description: 'Member not found' }),
            503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
        },
        params: t.Object({ uuid: t.String({ description: 'The member UUID' }) }),
        headers: t.Object({ authorization: t.String({ error: '$.error.notAllowed', description: 'Your authentication token' }) }, { error: '$.error.notAllowed' })
    })
);