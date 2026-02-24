import { t } from "elysia";
import { ElysiaApp } from "..";
import { Application } from "../database/schemas/Application";
import { DocumentationCategory } from "../types/DocumentationCategory";
import { Permission } from "../types/Permission";
import { tHeaders, tParams, tResponseBody, tSchema } from "../libs/models";

export default (app: ElysiaApp) => app.get('/', async ({ session, i18n, status }) => { // Get all applications
    if(!session?.player?.hasPermission(Permission.ViewApplications)) return status(403, { error: i18n('$.error.notAllowed') });

    const applications = await Application.find();

    return applications.map((application) => ({
        id: application.id,
        applicant: application.applicant,
        type: application.type,
        status: application.status,
        answers: application.answers,
        review: {
            reviewer: application.review.reviewer,
            timestamp: application.review.timestamp?.getTime() || null
        },
        submitted_at: application.submitted_at.getTime()
    }));
}, {
    detail: {
        tags: [DocumentationCategory.Applications],
        description: 'Get all applications'
    },
    response: {
        200: t.Array(tSchema.Application, { description: 'An application list' }),
        403: tResponseBody.Error
    },
    headers: tHeaders
}).get('/:id', async ({ session, params, i18n, status }) => { // Get a specific application
    if(!session?.player?.hasPermission(Permission.ViewApplications)) return status(403, { error: i18n('$.error.notAllowed') });

    const application = await Application.findOne({ id: params.id });
    if(!application) return status(404, { error: i18n('$.applications.not_found') });
    const { id, applicant, type, status: applicationStatus, answers, review, submitted_at } = application;

    return { id, applicant, type, status: applicationStatus, answers, review: { reviewer: review.reviewer, timestamp: review.timestamp?.getTime() || null }, submitted_at: submitted_at.getTime() };
}, {
    detail: {
        tags: [DocumentationCategory.Applications],
        description: 'Get a specific application'
    },
    response: {
        200: tSchema.Application,
        403: tResponseBody.Error,
        404: tResponseBody.Error
    },
    params: tParams.applicationId,
    headers: tHeaders
}) // TODO: Add router to create and edit applications
.delete('/:id', async ({ session, params, i18n, status }) => { // Delete gift code
    if(!session?.player?.hasPermission(Permission.DeleteApplications)) return status(403, { error: i18n('$.error.notAllowed') });

    const application = await Application.findOne({ id: params.id });
    if(!application) return status(404, { error: i18n('$.applications.not_found') });
    await application.deleteOne();

    // TODO: Add mod log

    return { message: i18n('$.applications.deleted') };
}, {
    detail: {
        tags: [DocumentationCategory.Applications],
        description: 'Delete an application'
    },
    response: {
        200: tResponseBody.Message,
        403: tResponseBody.Error,
        404: tResponseBody.Error
    },
    params: tParams.applicationId,
    headers: tHeaders
});