const {
    Node,
    Schema,
    fields
} = require('@mayahq/module-sdk')

// const defaultPosition = JSON.stringify({
//     x: 0,
//     y: 0,
//     w: 8,
//     h: 6,
//     maxW: 12,
//     maxH: 12
// })

class DashboardGroup extends Node {
    constructor(node, RED, opts) {
        super(node, RED, {
            ...opts,
            // masterKey: 'You can set this property to make the node fall back to this key if Maya does not provide one'
        })
    }

    static schema = new Schema({
        name: 'dashboard-group',
        label: 'dashboard-group',
        category: 'config',
        isConfig: true,
        fields: {
            title: new fields.Typed({type: 'str', allowedTypes: ['str'], defaultVal: 'Data', displayName: 'Title' }),
            width: new fields.Typed({type: 'num', allowedTypes: ['num'], defaultVal: 8, displayName: 'Columns' }),
            positionDetails: new fields.Typed({type: 'json', allowedTypes: ['json'], defaultVal: '{}', displayName: 'Positioning' }),
        },
    })

    onInit() {
        // Do something on initialization of node
    }

    async onMessage(msg, vals) {
        // Handle the message. The returned value will
        // be sent as the message to any further nodes.

    }
}

module.exports = DashboardGroup