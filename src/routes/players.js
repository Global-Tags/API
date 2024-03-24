const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const express = require(`express`);
const router = express.Router();

const colorCodeRegex = /(&|§)[0-9A-FK-ORX]/gi;

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
        icon: player.icon,
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
    const { blacklist, watchlist, min, max } = server.cfg.validation.tag;
    if(!tag || tag.length <= min || tag.length > max) return res.status(400).send({ error: `The tag has to be between ${min} and ${max} characters.` });
    if(blacklist.some((word) => {
        if(tag.replace(colorCodeRegex, ``).toLowerCase().includes(word)) {
            res.status(400).send({ error: `You're not allowed to include "${word}" in your Global Tag!` });
            return true;
        } else return false;
    })) return;
    const isWatched = (player && player.watchlist) || watchlist.some((word) => {
        if(tag.replace(colorCodeRegex, ``).toLowerCase().includes(word)) {
            console.log(`[INFO] Now watching ${uuid} for matching "${word}" in "${tag}".`);
            if(server.cfg.bot.enabled && server.cfg.bot.watchlist.active) bot.client.channels.cache.get(bot.cfg.watchlist.channel).send({
                content: bot.cfg.watchlist.content,
                embeds: [
                    new EmbedBuilder()
                    .setColor(0x5865f2)
                    .setTitle(`New watched player`)
                    .addFields([
                        {
                            name: `Watched UUID`,
                            value: `\`\`\`${player.uuid}\`\`\``
                        },
                        {
                            name: `New tag`,
                            value: `\`\`\`${tag}\`\`\``
                        },
                        {
                            name: `Matched word`,
                            value: `\`\`\`${word}\`\`\``
                        }
                    ])
                ],
                components: [
                    new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                        .setLabel(`Actions`)
                        .setCustomId(`actions`)
                        .setStyle(ButtonStyle.Primary),
                        new ButtonBuilder()
                        .setLabel(`Finish actions`)
                        .setCustomId(`finishAction`)
                        .setStyle(ButtonStyle.Success),
                    )
                ]
            });
            return true;
        }
        return false;
    });

    if(!player) {
        await new server.db.players({
            uuid,
            tag,
            watchlist: isWatched,
            history: [tag]
        }).save();
        
        res.status(201).send({ message: `Your tag was successfully set!` });
    } else {
        if(player.tag == tag) return res.status(400).send({ error: `You already have this tag!` });

        player.tag = tag;
        if(watchlist) player.watchlist = true;
        if(player.history[player.history.length - 1] != tag) player.history.push(tag);
        await player.save();
        
        res.status(200).send({ message: `Your tag was successfully updated!` });
    }

    if(isWatched && server.cfg.bot.enabled && server.cfg.bot.watchlist.active) bot.client.channels.cache.get(bot.cfg.watchlist.channel).send({
        content: bot.cfg.watchlist.content,
        embeds: [
            new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle(`New tag change`)
            .addFields([
                {
                    name: `Watched UUID`,
                    value: `\`\`\`${player.uuid}\`\`\``
                },
                {
                    name: `New tag`,
                    value: `\`\`\`${player.tag}\`\`\``
                }
            ])
        ],
        components: [
            new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                .setLabel(`Actions`)
                .setCustomId(`actions`)
                .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                .setLabel(`Finish actions`)
                .setCustomId(`finishAction`)
                .setStyle(ButtonStyle.Success),
            )
        ]
    });
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

router.post(`/:uuid/icon`, async (req, res) => {
    if(server.util.ratelimitResponse(req, res, server.ratelimit.changeIcon)) return;

    const uuid = req.params.uuid.replaceAll(`-`, ``);
    const icon = req.body.icon?.toUpperCase();
    const { authorization } = req.headers;
    const authenticated = authorization && server.util.validJWTSession(authorization, uuid, true);

    if(authorization == `0`) return res.status(401).send({ error: `You need a premium account to use this feature!` });
    if(!authenticated) return res.status(401).send({ error: `You're not allowed to perform that request!` });

    const player = await server.db.players.findOne({ uuid });
    if(!player) return res.status(404).send({ error: `You don't have a tag!` });
    if(player.isBanned()) return res.status(403).send({ error: `You are banned!` });
    if(!player.tag) return res.status(404).send({ error: `Please set a tag first!` });
    if(!icon) return res.status(400).send({ error: `Please provide an icon type!` });
    if(icon == player.icon) return res.status(400).send({ error: `You already chose this icon!` });
    if(server.cfg.validation.icon.blacklist.includes(icon.toLowerCase())) return res.status(403).send({ error: `You're not allowed to choose this icon!` });

    player.icon = icon;
    await player.save();

    res.status(200).send({ message: `Your icon was successfully set!` });
});

router.route(`/:uuid/ban`)
.get(async (req, res) => {
    const uuid = req.params.uuid.replaceAll(`-`, ``);
    const { authorization } = req.headers;
    const authenticated = authorization && server.util.validJWTSession(authorization, uuid, false);

    if(authorization == `0`) return res.status(401).send({ error: `You need a premium account to use this feature!` });
    if(!authenticated) return res.status(401).send({ error: `You're not allowed to perform that request!` });

    const executor = await server.db.players.findOne({ uuid: server.util.getUuidByJWT(authorization) });
    if(!executor || !executor.admin) return res.status(403).send({ error: `You're not allowed to perform that request!` });

    const player = await server.db.players.findOne({ uuid });
    if(!player) return res.status(404).send({ error: `There is no such player in our records!` });

    res.status(200).send({ banned: player.isBanned(), reason: player.isBanned() ? player.ban.reason || null : null });
}).post(async (req, res) => {
    const uuid = req.params.uuid.replaceAll(`-`, ``);
    const { authorization } = req.headers;
    const authenticated = authorization && server.util.validJWTSession(authorization, uuid, false);

    if(authorization == `0`) return res.status(401).send({ error: `You need a premium account to use this feature!` });
    if(!authenticated) return res.status(401).send({ error: `You're not allowed to perform that request!` });

    const executor = await server.db.players.findOne({ uuid: server.util.getUuidByJWT(authorization) });
    if(!executor || !executor.admin) return res.status(403).send({ error: `You're not allowed to perform that request!` });

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
    const authenticated = authorization && server.util.validJWTSession(authorization, uuid, false);

    if(authorization == `0`) return res.status(401).send({ error: `You need a premium account to use this feature!` });
    if(!authenticated) return res.status(401).send({ error: `You're not allowed to perform that request!` });

    const executor = await server.db.players.findOne({ uuid: server.util.getUuidByJWT(authorization) });
    if(!executor || !executor.admin) return res.status(403).send({ error: `You're not allowed to perform that request!` });

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
    // const reporter = await server.db.players.findOne({ uuid: reporterUuid });
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

    if(server.cfg.bot.enabled && server.cfg.bot.reports.active) bot.client.channels.cache.get(bot.cfg.reports.channel).send({
        content: bot.cfg.reports.content,
        embeds: [
            new EmbedBuilder()
            .setColor(0xff0000)
            .setTitle(`New report!`)
            .addFields([
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
            ])
        ],
        components: [
            new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                .setLabel(`Actions`)
                .setCustomId(`actions`)
                .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                .setLabel(`Finish actions`)
                .setCustomId(`finishAction`)
                .setStyle(ButtonStyle.Success),
            )
        ]
    });
    res.status(200).send({ message: `The player was successfully reported!` });
});

module.exports = router;