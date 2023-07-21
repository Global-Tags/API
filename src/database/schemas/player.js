const { SchemaTypes, Schema, model } = require('mongoose');
const Permission = require('../../Permission');

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
    permissions: {
        type: [SchemaTypes.Number],
        required: true,
        default: [
            Permission.ShowTag,
            Permission.GetTags,
            Permission.ChangeTag,
            Permission.ReportTag
        ]
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
         * @param {Permission[]} permissions 
         * @returns {boolean}
         */

        hasPermissions(...permissions) {
            return permissions.every((permission) => this.permissions.includes(permission));
        }
    }
});

module.exports = model('players', player);