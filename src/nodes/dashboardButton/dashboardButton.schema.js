const {
    Node,
    Schema,
    fields
} = require('@mayahq/module-sdk')
const { init, clients } = require('../../util/socket')
const DashboardGroup = require('../dashboardGroup/dashboardGroup.schema')

class DashboardButton extends Node {
    constructor(node, RED, opts) {
        super(node, RED, {
            ...opts,
            // masterKey: 'You can set this property to make the node fall back to this key if Maya does not provide one'
        })
    }

    static schema = new Schema({
        name: 'dashboard-button',
        label: 'dashboard-button',
        category: 'Maya Red Unugly Dashboard',
        isConfig: false,
        fields: {
            width: new fields.Typed({ type: "num", allowedTypes: ["num"], displayName: "Width", defaultVal: 2 }),
            label: new fields.Typed({ type: "str", allowedTypes: ["str"], displayName: "Label", defaultVal: "Button" }),
            tooltip: new fields.Typed({ type: "str", allowedTypes: ["str"], displayName: "Tooltip", defaultVal: "" }),
            color: new fields.Typed({ type: "str", allowedTypes: ["str"], displayName: "Color", defaultVal: "" }),
            // loadingOnClick: new fields.Typed({ type: "bool", allowedTypes: ["bool"], displayName: "Show loading on click", defaultVal: true }),
            loadingOnClick: new fields.Select({ options: ['yes', 'no'], defaultVal: 'yes', displayName: "Show loading on click" }),
            payloadOnClick: new fields.Typed({
                type: "flow", 
                allowedTypes: ["msg", "flow", "global", "str", "num", "boolean", "json"], 
                displayName: "Payload to send on click", 
                defaultVal: "payload"
            }),
            group: new fields.ConfigNode({ type: DashboardGroup, displayName: 'Group' })
            // Whatever custom fields the node needs.
        },
    })

    onInit() {
        // init(this.RED.server, this.RED.settings)
    }

    async onMessage(msg, vals) {
        // const _sockId = msg.sockId
        // let socks = []
        // if (_sockId) {
        //     socks = [_sockId]
            
        // } else {
        //     socks = Object.keys(clients)
        // }

        // socks.forEach(sockId => {
        //     const sock = clients[sockId]
        //     if (!sock) {
        //         return
        //     }
        //     sock.emit('dashboardDataUpdate', {
        //         componentType: 'BUTTON',
        //         componentId: `button::${this.redNode.id}`,
        //         event: msg.tableEvent,
        //         sockId: sockId
        //     })
        // })

        return null
    }
}

module.exports = DashboardButton