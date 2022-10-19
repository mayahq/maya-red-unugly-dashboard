const {
    Node,
    Schema,
    fields
} = require('@mayahq/module-sdk')
const { init, clients, uiEventListener } = require('../../util/socket')
const DashboardGroup = require('../dashboardGroup/dashboardGroup.schema')

class DashboardTable extends Node {
    constructor(node, RED, opts) {
        super(node, RED, {
            ...opts,
            // masterKey: 'You can set this property to make the node fall back to this key if Maya does not provide one'
        })
    }

    static schema = new Schema({
        name: 'dashboard-table',
        label: 'dashboard-table',
        category: 'Maya Red Unugly Dashboard',
        isConfig: false,
        fields: {
            alias: new fields.Typed({ type: "str", allowedTypes: ["str"], displayName: "Alias", defaultVal: 'myTable' }),
            width: new fields.Typed({ type: "num", allowedTypes: ["num"], displayName: "Width", defaultVal: 8 }),
            group: new fields.ConfigNode({ type: DashboardGroup, displayName: 'Group' })
            // Whatever custom fields the node needs.
        },
    })

    onInit() {
        init(this.RED.server, this.RED.settings)
        uiEventListener.on(`table:${this.redNode.id}`, ({ event, _sockId }) => {
            const { rowData } = event
            const payload = {}
            Object.keys(rowData).forEach(key => {
                payload[key] = rowData[key].value
            })
            this.redNode.send({ rowData: [rowData], payload, _sockId })
        })
    }

    async onMessage(msg, vals) {
        const tableEvent = msg.tableEvent

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
                componentType: 'TABLE',
                componentId: `table:${this.redNode.id}`,
                event: tableEvent,
                sockId: sockId
            })
        })

        return null
    }
}

module.exports = DashboardTable