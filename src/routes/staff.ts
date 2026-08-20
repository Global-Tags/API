import { t } from "elysia";
import { ElysiaApp } from "..";
import { formatUUID, GameProfile, stripUUID, uuidRegex } from "../libs/game-profiles";
import { Permission } from "../types/Permission";
import { getNextPosition, StaffCategory } from "../libs/database/schemas/StaffCategory";
import { StaffMember } from "../libs/database/schemas/StaffMember";
import { tHeaders, tRequestBody, tResponseBody, tSchema } from "../libs/models";
import { DocumentationCategory } from "../types/DocumentationCategory";

export default (app: ElysiaApp) => app.get('/', async () => {
    const categories = await StaffCategory.find().sort({ position: 1 }).lean();

    return await Promise.all(
        categories.map(async (category) => {
            const members = await StaffMember.find({ category: category.id }).sort({ joinedAt: 1 }).lean();

            const mappedMembers = await Promise.all(members.map(async (member) => ({
                uuid: member.uuid,
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
        tags: [DocumentationCategory.Staff],
        description: 'Get the staff team overview'
    },
    response: {
        200: tResponseBody.StaffList
    }
}).group('/categories', (group) =>
    group.get('/', async ({ session, i18n, status }) => {
        if(!session?.player?.hasPermission(Permission.ViewStaffCategories)) return status(403, { error: i18n('$.error.notAllowed') });

        return Promise.all((await StaffCategory.find().sort({ position: 1 }).lean()).map(async (category) => ({
            id: category.id,
            name: category.name,
            position: category.position,
            members: (await StaffMember.find({ category: category.id }).sort({ joinedAt: 1 }).lean()).length
        })));
    }, {
        detail: {
            tags: [DocumentationCategory.Staff],
            description: 'Get all staff categories'
        },
        response: {
            200: t.Array(tSchema.MemberlistStaffCategory, { description: 'A staff category list' }),
            403: tResponseBody.Error,
        }
    }).get('/:category', async ({ session, params: { category: id }, i18n, status }) => {
        if(!session?.player?.hasPermission(Permission.ViewStaffCategories)) return status(403, { error: i18n('$.error.notAllowed') });

        const category = await StaffCategory.findOne({ id }).lean();
        if(!category) return status(404, { error: i18n('$.staff.categories.not_found') });
        const members = await StaffMember.find({ category: category.id }).sort({ joinedAt: 1 }).lean();

        return {
            id: category.id,
            name: category.name,
            position: category.position,
            members: members.length
        };
    }, {
        detail: {
            tags: [DocumentationCategory.Staff],
            description: 'Get a specific staff category'
        },
        response: {
            200: tSchema.MemberlistStaffCategory,
            403: tResponseBody.Error,
            404: tResponseBody.Error,
        },
        params: t.Object({ category: t.String({ description: 'The category ID' }) }),
        headers: tHeaders,
    }).post('/', async ({ session, body: { name }, i18n, status }) => {
        if(!session?.player?.hasPermission(Permission.CreateStaffCategories)) return status(403, { error: i18n('$.error.notAllowed') });

        const category = await StaffCategory.insertOne({
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
            tags: [DocumentationCategory.Staff],
            description: 'Create a new staff category'
        },
        response: {
            201: tSchema.StaffCategory,
            403: tResponseBody.Error,
        },
        body: tRequestBody.StaffCategory,
        headers: tHeaders
    }).patch('/:id', async ({ session, body: { name }, params: { id }, i18n, status }) => { // Edit category
        if(!session?.player?.hasPermission(Permission.EditStaffMembers)) return status(403, { error: i18n('$.error.notAllowed') });

        const category = await StaffCategory.findOne({ id });
        if(!category) return status(404, { error: i18n('$.staff.categories.not_found') });

        if(name && category.name !== name.trim()) {
            category.name = name.trim();
            category.markModified('name');
            await category.save();

            // TODO: notification
        }

        return {
            id: category.id,
            name: category.name,
            position: category.position
        };
    }, {
        detail: {
            tags: [DocumentationCategory.Staff],
            description: 'Edit an existing staff category'
        },
        response: {
            200: tSchema.StaffCategory,
            403: tResponseBody.Error,
            404: tResponseBody.Error,
        },
        body: tRequestBody.StaffCategory,
        params: t.Object({ id: t.String({ description: 'The category ID' }) }),
        headers: tHeaders
    }) // TODO: Implement route to patch all categories at once
    .delete('/:category', async ({ session, params: { category: id }, i18n, status }) => {
        if(!session?.player?.hasPermission(Permission.DeleteStaffCategories)) return status(403, { error: i18n('$.error.notAllowed') });

        const category = await StaffCategory.findOne({ id });
        if(!category) return status(404, { error: i18n('$.staff.categories.not_found') });

        await category.deleteOne();

        return { message: i18n('$.staff.categories.delete.success').replace('<name>', category.name) };
    }, {
        detail: {
            tags: [DocumentationCategory.Staff],
            description: 'Delete a specific staff category'
        },
        response: {
            200: tResponseBody.Message,
            403: tResponseBody.Error,
            404: tResponseBody.Error,
        },
        params: t.Object({ category: t.String({ description: 'The category ID' }) }),
        headers: tHeaders,
    })
).group('/members', (group) =>
    group.get('/', async ({ session, i18n, status }) => {
        if(!session?.player?.hasPermission(Permission.ViewStaffMembers)) return status(403, { error: i18n('$.error.notAllowed') });

        return Promise.all((await StaffMember.find().sort({ joinedAt: 1 }).lean()).map(async member => ({
            uuid: formatUUID(member.uuid),
            username: (await GameProfile.getProfileByUUID(member.uuid)).username || 'Unknown',
            category: member.category,
            description: member.description || null,
            joined_at: member.joined_at.getTime()
        })));
    }, {
        detail: {
            tags: [DocumentationCategory.Staff],
            description: 'Get all staff members'
        },
        response: {
            200: t.Array(tSchema.StaffMember, { description: 'A staff member list' }),
            403: tResponseBody.Error,
        }
    }).get('/:uuid', async ({ session, params: { uuid }, i18n, status }) => {
        if(!session?.player?.hasPermission(Permission.ViewStaffMembers)) return status(403, { error: i18n('$.error.notAllowed') });

        const member = await StaffMember.findOne({ uuid: stripUUID(uuid) }).lean();
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
            tags: [DocumentationCategory.Staff],
            description: 'Get a specific staff member'
        },
        response: {
            200: tSchema.StaffMember,
            403: tResponseBody.Error,
            404: tResponseBody.Error,
        },
        params: t.Object({ uuid: t.String({ description: 'The member UUID' }) }),
        headers: tHeaders,
    }).post('/', async ({ session, body: { uuid, category, description }, i18n, status }) => {
        if(!session?.player?.hasPermission(Permission.CreateStaffMembers)) return status(403, { error: i18n('$.error.notAllowed') });

        uuid = stripUUID(uuid.trim());

        if(!uuidRegex.test(uuid)) return status(400, { error: i18n('$.staff.members.invalid_uuid') });
        if(await StaffMember.exists({ uuid })) return status(409, { error: i18n('$.staff.members.already_exists') });
        if(!(await StaffCategory.exists({ id: category }))) return status(404, { error: i18n('$.staff.categories.not_found') });

        const joinedAt = new Date();
        joinedAt.setHours(0, 0, 0, 0);

        const newMember = await StaffMember.insertOne({
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
            tags: [DocumentationCategory.Staff],
            description: 'Create a new staff member'
        },
        response: {
            201: tSchema.StaffMember,
            400: tResponseBody.Error,
            403: tResponseBody.Error,
            404: tResponseBody.Error,
            409: tResponseBody.Error,
        },
        body: tRequestBody.CreateStaffMember,
        headers: tHeaders
    }).patch('/:uuid', async ({ session, body: { category, description }, params: { uuid }, i18n, status }) => {
        if(!session?.player?.hasPermission(Permission.EditStaffMembers)) return status(403, { error: i18n('$.error.notAllowed') });

        const member = await StaffMember.findOne({ uuid: stripUUID(uuid) });
        if(!member) return status(404, { error: i18n('$.staff.members.not_found') });

        if(category !== undefined && member.category !== category) {
            if(!(await StaffCategory.exists({ id: category }))) return status(404, { error: i18n('$.staff.categories.not_found') });
            member.category = category;
            member.markModified('category');
        }
        if(description !== undefined && member.description !== description?.trim()) {
            member.description = description?.trim() || null;
            member.markModified('description');
        }
        if(member.isModified()) {
            member.save();
            // TODO: notification
        }

        return {
            uuid: formatUUID(member.uuid),
            username: (await GameProfile.getProfileByUUID(member.uuid)).username || 'Unknown',
            category: member.category,
            description: member.description || null,
            joined_at: member.joined_at.getTime()
        };
    }, {
        detail: {
            tags: [DocumentationCategory.Staff],
            description: 'Edit an existing staff member'
        },
        response: {
            200: tSchema.StaffMember,
            403: tResponseBody.Error,
            404: tResponseBody.Error,
        },
        body: tRequestBody.EditStaffMember,
        params: t.Object({ uuid: t.String({ description: 'The member UUID' }) }),
        headers: tHeaders
    }).delete('/:uuid', async ({ session, params: { uuid }, i18n, status }) => {
        if(!session?.player?.hasPermission(Permission.DeleteStaffMembers)) return status(403, { error: i18n('$.error.notAllowed') });

        const member = await StaffMember.findOne({ uuid: stripUUID(uuid) });
        if(!member) return status(404, { error: i18n('$.staff.members.not_found') });

        await member.deleteOne();

        return { message: i18n('$.staff.members.delete.success').replace('<username>', (await GameProfile.getProfileByUUID(uuid)).username || 'Unknown') };
    }, {
        detail: {
            tags: [DocumentationCategory.Staff],
            description: 'Delete a specific staff member'
        },
        response: {
            200: tResponseBody.Message,
            403: tResponseBody.Error,
            404: tResponseBody.Error,
        },
        params: t.Object({ uuid: t.String({ description: 'The member UUID' }) }),
        headers: tHeaders
    })
);