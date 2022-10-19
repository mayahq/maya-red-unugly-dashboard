const {
    Node,
    Schema,
    fields
} = require('@mayahq/module-sdk')
const { clients } = require('../../util/socket')
const DashboardGroup = require('../dashboardGroup/dashboardGroup.schema')

class DashboardTemplate extends Node {
    constructor(node, RED, opts) {
        super(node, RED, {
            ...opts,
            // masterKey: 'You can set this property to make the node fall back to this key if Maya does not provide one'
        })
    }

    static schema = new Schema({
        name: 'dashboard-template',
        label: 'dashboard-template',
        category: 'Maya Red Unugly Dashboard',
        isConfig: false,
        fields: {
            templateType: new fields.Select({ options: ['email', 'text'], defaultVal: 'email', displayName: 'Type' }),
            width: new fields.Typed({ type: "num", allowedTypes: ["num"], displayName: "Width", defaultVal: 8 }),
            group: new fields.ConfigNode({ type: DashboardGroup, displayName: 'Group' }),
        },

    })

    onInit() {
        init(this.RED.server, this.RED.settings)
        // Do something on initialization of node
    }

    async onMessage(msg, vals) {
        const _sockId = msg._sockId
        let socks = []
        if (_sockId) {
            socks = [_sockId]
        } else {
            socks = Object.keys(clients)
        }

        socks.forEach(sockId => {
            const sock = clients[sockId]
            if (!sock) {
                return
            }
            sock.emit('dashboardDataUpdate', {
                componentType: 'TEMPLATE',
                componentId: `template:${this.redNode.id}`,
                event: msg.templateEvent,
                sockId: sockId
            })
        })
    }
}

module.exports = DashboardTemplate