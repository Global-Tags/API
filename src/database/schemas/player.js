const { SchemaTypes, Schema, model } = require('mongoose');
const Permission = require('../../Permission');

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
    permissions: {
        type: [SchemaTypes.Number],
        required: true,
        default: Permission.DEFAULT
    },
    banned: {
        type: SchemaTypes.Boolean,
        required: true,
        default: false
    }
}, {
    methods: {

        /**
         * 
         * @param {number[]} permissions 
         * @returns {boolean}
         */

        hasPermissions(permissions) {
            return permissions.every((permission) => this.permissions.includes(permission));
        },

        /**
         * 
         * @param {number} permission 
         * @returns {boolean}
         */

        hasPermission(permission) {
            return this.permissions.includes(permission);
        }
    }
});

module.exports = model('players', player);