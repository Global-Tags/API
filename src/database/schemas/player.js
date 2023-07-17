const { SchemaTypes, Schema, model } = require('mongoose');

const player = Schema({
    uuid: {
        type: SchemaTypes.String,
        required: true,
        unique: true
    },
    tag: SchemaTypes.String,
    history: {
        type: [SchemaTypes.String],
        required: true,
        default: []
    },
    reports: {
        type: [
            {
                by: SchemaTypes.String,
                reportedName: SchemaTypes.String
            }
        ],
        required: true,
        default: []
    },
    banned: {
        type: SchemaTypes.Boolean,
        required: true,
        default: false
    }
});

module.exports = model('players', player);