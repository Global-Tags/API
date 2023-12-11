const { default: axios } = require("axios");
const express = require(`express`);
const router = express.Router();

router.route(`/:uuid`)
.get(async (req, res) => {
    if(server.util.ratelimitResponse(req, res, server.ratelimit.getTag)) return;

    const uuid = req.params.uuid.replaceAll(`-`, ``);
    const { authorization } = req.headers;
    const authenticated = authorization && server.util.validJWTSession(authorization, uuid, false);

    if(authorization == `0`) return res.status(401).send({ error: `You need a premium account to use this feature!` });
    if(server.cfg.requireSessionIds && !authenticated) return res.status(401).send({ error: `You're not allowed to perform that request!` });

    const player = await server.db.players.findOne({ uuid });
    if(!player) return res.status(404).send({ error: `This player does not have a tag!` });
    if(player.isBanned()) return res.status(403).send({ error: `This player is banned!` });

    res.send({
        uuid: player.uuid,
        tag: player.tag,
        position: player.position,
        admin: player.admin
    });
}).post(async (req, res) => {
    if(server.util.ratelimitResponse(req, res, server.ratelimit.changeTag)) return;

    const uuid = req.params.uuid.replaceAll(`-`, ``);
    const { tag } = req.body;
    const { authorization } = req.headers;
    const authenticated = authorization && server.util.validJWTSession(authorization, uuid, true);

    if(authorization == `0`) return res.status(401).send({ error: `You need a premium account to set a global tag!` });
    if(!authenticated) return res.status(401).send({ error: `You're not allowed to perform that request!` });
    
    const player = await server.db.players.findOne({ uuid });
    if(player && player.isBanned()) return res.status(403).send({ error: `You are banned from changing your tag!` });
    const { minTag, maxTag } = server.cfg.validation;
    if(!tag || tag.length <= minTag || tag.length > maxTag) return res.status(400).send({ error: `The tag has to be between ${minTag} and ${maxTag} characters.` });
    if([`labymod`].some((word) => {
        if(tag.replace(/(&|§)[0-9A-FK-ORX]/gi, ``).toLowerCase().includes(word)) {
            res.status(400).send({ error: `You're not allowed to include "${word}" in your Global Tag!` });
            return true;
        } else return false;
    })) return;

    if(!player) {
        await new server.db.players({
            uuid,
            tag,
            history: [tag]
        }).save();
        
        res.status(201).send({ message: `Your tag was successfully set!` });
    } else {
        if(player.tag == tag) return res.status(400).send({ error: `You already have this tag!` });

        player.tag = tag;
        if(player.history[player.history.length - 1] != tag) player.history.push(tag);
        await player.save();
        
        res.status(200).send({ message: `Your tag was successfully updated!` });
    }
}).delete(async (req, res) => {
    if(server.util.ratelimitResponse(req, res, server.ratelimit.changeTag)) return;

    const uuid = req.params.uuid.replaceAll(`-`, ``);
    const { authorization } = req.headers;
    const authenticated = authorization && server.util.validJWTSession(authorization, uuid, true);

    if(authorization == `0`) return res.status(401).send({ error: `You need a premium account to use this feature!` });
    if(!authenticated) return res.status(401).send({ error: `You're not allowed to perform that request!` });

    const player = await server.db.players.findOne({ uuid });
    if(!player) return res.status(404).send({ error: `You don't have a tag!` });
    if(player.isBanned()) return res.status(403).send({ error: `You are banned!` });
    if(!player.tag) return res.status(404).send({ error: `You don't have a tag!` });

    player.tag = null;
    await player.save();

    res.status(200).send({ message: `Your tag was successfully reset!` });
});

router.post(`/:uuid/position`, async (req, res) => {
    if(server.util.ratelimitResponse(req, res, server.ratelimit.changePosition)) return;

    const uuid = req.params.uuid.replaceAll(`-`, ``);
    const position = req.body.position?.toUpperCase();
    const { authorization } = req.headers;
    const authenticated = authorization && server.util.validJWTSession(authorization, uuid, true);

    if(authorization == `0`) return res.status(401).send({ error: `You need a premium account to use this feature!` });
    if(!authenticated) return res.status(401).send({ error: `You're not allowed to perform that request!` });

    const player = await server.db.players.findOne({ uuid });
    if(!player) return res.status(404).send({ error: `You don't have a tag!` });
    if(player.isBanned()) return res.status(403).send({ error: `You are banned!` });
    if(!player.tag) return res.status(404).send({ error: `Please set a tag first!` });
    if(!position || ![`ABOVE`, `BELOW`, `RIGHT`, `LEFT`].includes(position)) return res.status(400).send({ error: `Please provide a position!` });
    if(position == player.position) return res.status(400).send({ error: `Your tag is already in this position!` });

    player.position = position;
    await player.save();

    res.status(200).send({ message: `Your position was successfully set!` });
});

router.route(`/:uuid/ban`)
.get(async (req, res) => {
    const uuid = req.params.uuid.replaceAll(`-`, ``);
    const { authorization } = req.headers;
    const authenticated = authorization && server.util.validJWTSession(authorization, uuid, true);

    if(authorization == `0`) return res.status(401).send({ error: `You need a premium account to use this feature!` });
    if(!authenticated) return res.status(401).send({ error: `You're not allowed to perform that request!` });

    const executer = await server.db.players.findOne({ uuid: server.util.getUuidByJWT(authorization) });
    if(!executer || !executer.admin) return res.status(403).send({ error: `You're not allowed to perform that request!` });

    const player = await server.db.players.findOne({ uuid });
    if(!player) return res.status(404).send({ error: `There is no such player in our records!` });

    res.status(200).send({ banned: player.isBanned(), reason: `${player.ban.reason}` });
}).post(async (req, res) => {
    const uuid = req.params.uuid.replaceAll(`-`, ``);
    const { authorization } = req.headers;
    const authenticated = authorization && server.util.validJWTSession(authorization, uuid, true);

    if(authorization == `0`) return res.status(401).send({ error: `You need a premium account to use this feature!` });
    if(!authenticated) return res.status(401).send({ error: `You're not allowed to perform that request!` });

    const executer = await server.db.players.findOne({ uuid: server.util.getUuidByJWT(authorization) });
    if(!executer || !executer.admin) return res.status(403).send({ error: `You're not allowed to perform that request!` });

    const player = await server.db.players.findOne({ uuid });
    if(!player) return res.status(404).send({ error: `There is no such player in our records!` });
    if(player.isBanned()) return res.status(409).send({ error: `This player is already banned!` });

    player.ban.active = true;
    player.ban.reason = req.body.reason || `No reason provided`;
    await player.save();

    res.status(200).send({ message: `The player was successfully banned!` });
}).delete(async (req, res) => {
    const uuid = req.params.uuid.replaceAll(`-`, ``);
    const { authorization } = req.headers;
    const authenticated = authorization && server.util.validJWTSession(authorization, uuid, true);

    if(authorization == `0`) return res.status(401).send({ error: `You need a premium account to use this feature!` });
    if(!authenticated) return res.status(401).send({ error: `You're not allowed to perform that request!` });

    const executer = await server.db.players.findOne({ uuid: server.util.getUuidByJWT(authorization) });
    if(!executer || !executer.admin) return res.status(403).send({ error: `You're not allowed to perform that request!` });

    const player = await server.db.players.findOne({ uuid });
    if(!player) return res.status(404).send({ error: `There is no such player in our records!` });
    if(!player.isBanned()) return res.status(409).send({ error: `This player is not banned!` });

    player.ban.active = false;
    player.ban.reason = null;
    await player.save();

    res.status(200).send({ message: `The player was successfully unbanned!` });
});

router.post(`/:uuid/report`, async (req, res) => {
    if(server.util.ratelimitResponse(req, res, server.ratelimit.report)) return;

    const uuid = req.params.uuid.replaceAll(`-`, ``);
    const { authorization } = req.headers;
    const authenticated = authorization && server.util.validJWTSession(authorization, uuid, false);

    if(authorization == `0`) return res.status(401).send({ error: `You need a premium account to use this feature!` });
    if(!authenticated) return res.status(401).send({ error: `You're not allowed to perform that request!` });

    const player = await server.db.players.findOne({ uuid });
    if(!player) return res.status(404).send({ error: `This player does not have a tag!` });
    if(player.isBanned()) return res.status(403).send({ error: `The player is already banned!` });
    if(player.admin) return res.status(403).send({ error: `You can't report admins!` });
    if(!player.tag) return res.status(404).send({ error: `This player does not have a tag!` });

    const reporterUuid = server.util.getUuidByJWT(authorization);
    const reporter = await server.db.players.findOne({ uuid: reporterUuid });
    // if(reporter && reporter.isBanned()) return res.status(403).send({ error: `You are banned from reporting other players!` });

    if(reporterUuid == uuid) return res.status(400).send({ error: `You can't report yourself!` });
    if(player.reports.some((report) => report.by == reporterUuid && report.reportedName == player.tag)) return res.status(400).send({ error: `You already reported this player's tag!` });
    const { reason } = req.body;
    if(!reason || typeof reason != 'string' || reason.trim() == ``) return res.status(400).send({ error: `You have to provide a valid reason!` });

    player.reports.push({
        by: reporterUuid,
        reportedName: player.tag,
        reason
    });
    await player.save();

    if(server.cfg.discordReports.active) axios.post(server.cfg.discordReports.webhook, {
        content: server.cfg.discordReports.content,
        embeds: [{
            color: 0xff0000,
            title: `New Report!`,
            fields: [
                {
                    name: `Reported UUID`,
                    value: `\`\`\`${player.uuid}\`\`\``
                },
                {
                    name: `Reported Tag`,
                    value: `\`\`\`${player.tag}\`\`\``
                },
                {
                    name: `Reporter UUID`,
                    value: `\`\`\`${reporterUuid}\`\`\``
                },
                {
                    name: `Reason`,
                    value: `\`\`\`${reason}\`\`\``
                }
            ]
        }]
    });
    res.status(200).send({ message: `The player was successfully reported!` });
});

module.exports = router;