const { default: axios } = require("axios");
const express = require(`express`);
const router = express.Router();

router.route(`/:uuid`)
.get(async (req, res) => {
    const uuid = req.params.uuid.replaceAll(`-`, ``);
    const { authorization } = req.headers;
    const authenticated = authorization && await server.util.validSession(authorization, uuid, false);

    if(authorization == `0`) return res.status(401).send({ error: `You need a premium account to use this feature!` });
    if(server.cfg.requireSessionIds && !authenticated) return res.status(401).send({ error: `You're not allowed to perform that request!` });

    const player = await server.db.players.findOne({ uuid });
    if(!player) return res.status(404).send({ error: `This player does not have a tag!` });
    if(player.banned) return res.status(403).send({ error: `This player is banned from using this addon!` });

    res.send({
        uuid: player.uuid,
        tag: player.tag
    });
}).post(async (req, res) => {
    const uuid = req.params.uuid.replaceAll(`-`, ``);
    const { tag } = req.body;
    const { authorization } = req.headers;
    const authenticated = authorization && await server.util.validSession(authorization, uuid, true);

    if(authorization == `0`) return res.status(401).send({ error: `You need a premium account to set a global tag!` });
    if(!authenticated) return res.status(401).send({ error: `You're not allowed to perform that request!` });
    
    const player = await server.db.players.findOne({ uuid });
    if(player && player.banned) return res.status(403).send({ error: `You are banned from using this addon!` });
    if(!tag || tag.length <= server.cfg.validation.minTag || tag.length > server.cfg.validation.maxTag) return res.status(400).send({ error: `The tag has to be between 1 and 30 characters.` });
    
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
    const uuid = req.params.uuid.replaceAll(`-`, ``);
    const { authorization } = req.headers;
    const authenticated = authorization && await server.util.validSession(authorization, uuid, true);

    if(authorization == `0`) return res.status(401).send({ error: `You need a premium account to use this feature!` });
    if(!authenticated) return res.status(401).send({ error: `You're not allowed to perform that request!` });

    const player = await server.db.players.findOne({ uuid });
    if(!player) return res.status(404).send({ error: `You don't have a tag!` });
    if(player.banned) return res.status(403).send({ error: `You are banned from using this addon!` });
    if(!player.tag) return res.status(404).send({ error: `You don't have a tag!` });

    player.tag = null;
    await player.save();

    res.status(200).send({ message: `Your tag was successfully reset!` });
});

router.post(`/:uuid/report`, async (req, res) => {
    const uuid = req.params.uuid.replaceAll(`-`, ``);
    const { authorization } = req.headers;
    const authenticated = authorization && await server.util.validSession(authorization, uuid, false);

    if(authorization == `0`) return res.status(401).send({ error: `You need a premium account to use this feature!` });
    if(!authenticated) return res.status(401).send({ error: `You're not allowed to perform that request!` });

    const player = await server.db.players.findOne({ uuid });
    if(!player) return res.status(404).send({ error: `This player does not have a tag!` });
    if(player.banned) return res.status(403).send({ error: `This user is already banned!` });
    if(!player.tag) return res.status(404).send({ error: `This player does not have a tag!` });

    const reporterUuid = await server.util.getUuidbySession(authorization);
    const reporter = await server.db.players.findOne({ uuid: reporterUuid });
    if(reporter && reporter.banned) return res.status(403).send({ error: `You are banned from using this addon!` });

    if(reporterUuid == uuid) return res.status(400).send({ error: `You can't report yourself!` });
    if(player.reports.some((report) => report.by == reporterUuid && report.reportedName == player.tag)) return res.status(400).send({ error: `You already reported this player's tag!` });

    player.reports.push({
        by: reporterUuid,
        reportedName: player.tag
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
                }
            ]
        }]
    });
    res.status(200).send({ message: `The player was reported!` });
});

module.exports = router;