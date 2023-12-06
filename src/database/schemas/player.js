const { SchemaTypes, Schema, model } = require('mongoose');

const player = new Schema({
    uuid: {
        type: SchemaTypes.String,
        required: true,
        unique: true
    },
    tag: SchemaTypes.String,
    position: {
        type: SchemaTypes.String,
        enum: [`ABOVE`, `BELOW`, `RIGHT`, `LEFT`],
        required: true,
        default: `ABOVE`
    },
    history: {
        type: [SchemaTypes.String],
        required: true,
        default: []
    },
    reports: {
        type: [
            {
                by: SchemaTypes.String,
                reportedName: SchemaTypes.String,
                reason: SchemaTypes.String
            }
        ],
        required: true,
        default: []
    },
    admin: {
        type: SchemaTypes.Boolean,
        required: true,
        default: false
    },
    banned: {
        type: SchemaTypes.Boolean,
        required: true,
        default: false
    }
});

module.exports = model('players', player);