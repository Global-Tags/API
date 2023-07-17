const express = require(`express`);
const router = express.Router();

router.route(`/:uuid`)
.get(async (req, res) => {
    const uuid = req.params.uuid.replaceAll(`-`, ``);
    const { authorization } = req.headers;
    const authenticated = authorization && await server.util.validSession(authorization, uuid);

    if(server.cfg.requireSessionIds && !authenticated) return res.status(401).send({ message: `You're not allowed to perform that request!` });

    const player = await server.db.players.findOne({ uuid });
    if(!player) return res.status(404).send({ message: `This player does not have a tag!` });

    res.send({
        uuid: player.uuid,
        tag: player.tag
    });
}).post(async (req, res) => {
    const uuid = req.params.uuid.replaceAll(`-`, ``);
    const { tag } = req.body;
    const { authorization } = req.headers;
    const authenticated = authorization && await server.util.validSession(authorization, uuid);

    if(!authenticated) return res.status(401).send({ message: `You're not allowed to perform that request!` });
    if(!tag) return res.status(400).send({ message: `Please provide a tag property!` });

    const player = await server.db.players.findOne({ uuid });
    
    if(!player) {
        await new server.db.players({
            uuid,
            tag,
            history: [tag]
        }).save();
        
        res.status(201).send({ message: `Your tag was successfully set!` });
    } else {
        if(player.tag == tag) return res.status(400).send({ message: `You already have this tag!` });

        player.tag = tag;
        player.history.push(tag);
        await player.save();
        
        res.status(200).send({ message: `Your tag was successfully updated!` });
    }
}).delete(async (req, res) => {
    const uuid = req.params.uuid.replaceAll(`-`, ``);
    const { authorization } = req.headers;
    const authenticated = authorization && await server.util.validSession(authorization, uuid);

    if(!authenticated) return res.status(401).send({ message: `You're not allowed to perform that request!` });

    const player = await server.db.players.findOne({ uuid });
    if(!player) return res.status(404).send({ message: `This player does not have a tag!` });

    player.tag = null;
    await player.save();

    res.status(200).send({ message: `Your tag was successfully reset!` });
});

module.exports = router;