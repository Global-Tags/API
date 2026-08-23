import { t } from "elysia";
import { tHeaders, tParams, tRequestBody, tResponseBody } from "../../../libs/models";
import { DocumentationCategory } from "../../../types/DocumentationCategory";
import { imageErrorTranslation, processUploadedImage } from "../../../libs/image-processor";
import { partnerIconFile } from "../../../libs/data-accessor";
import { config } from "../../../libs/config";
import { Partner } from "../../../libs/database/schemas/Partner";
import { Permission } from "../../../types/Permission";
import { ElysiaApp } from "../../..";
import { stripUUID } from "../../../libs/game-profiles";

export default (app: ElysiaApp) => app.get('/', async ({ params: { uuid }, i18n, status }) => { // Get partner icon
    const partner = await Partner.findOne({ uuid: stripUUID(uuid) });
    if(!partner) return status(404, { error: i18n('$.partners.not_found') });

    const file = partnerIconFile(partner.uuid);
    if(!(await file.exists())) return status(404, { error: i18n('$.error.noIcon') });

    return file as File;
}, {
    detail: {
        tags: [DocumentationCategory.Partners],
        description: 'Get the partner icon'
    },
    response: {
        200: t.File({ description: 'The partner icon file' }),
        404: tResponseBody.Error,
    },
    params: tParams.partnerUuid,
    headers: tHeaders
}).post('/', async ({ session, params, body, i18n, status }) => { // Set role icon
    if(!session?.selfOrHasPermission(Permission.ManagePartners)) return status(403, { error: i18n('$.error.notAllowed') });

    const partner = await Partner.findOne({ uuid: stripUUID(params.uuid) });
    if(!partner) return status(404, { error: i18n('$.partners.not_found') });

    try {
        await processUploadedImage(
            new Bun.Image(await body.image.arrayBuffer()),
            config.validation.icon.maxResolution,
            partnerIconFile(partner.uuid)
        );

        return { message: i18n('$.partners.icon.upload.success') };
    } catch(err) {
        return status(422, { error: i18n(imageErrorTranslation(err)) });
    }
}, {
    detail: {
        tags: [DocumentationCategory.Partners],
        description: 'Set the partner icon',
    },
    response: {
        200: tResponseBody.Message,
        404: tResponseBody.Error,
        403: tResponseBody.Error,
        422: tResponseBody.Error
    },
    body: tRequestBody.UploadPartnerIcon,
    params: tParams.partnerUuid,
    headers: tHeaders
});