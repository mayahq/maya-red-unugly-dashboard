const {
    Node,
    Schema,
    fields
} = require('@mayahq/module-sdk')
const { init, clients } = require('../../util/socket')
const DashboardGroup = require('../dashboardGroup/dashboardGroup.schema')

class DashboardImage extends Node {
    constructor(node, RED, opts) {
        super(node, RED, {
            ...opts,
            // masterKey: 'You can set this property to make the node fall back to this key if Maya does not provide one'
        })
    }

    static schema = new Schema({
        name: 'dashboard-image',
        label: 'Image',
        category: 'Maya Red Unugly Dashboard',
        isConfig: false,
        fields: {
            src: new fields.Typed({ type: 'str', allowedTypes: ['str', 'msg', 'flow', 'global'], displayName: 'Image URL' }),
            caption: new fields.Typed({ type: 'str', allowedTypes: ['str', 'msg', 'flow', 'global'], displayName: 'Caption' }),
            width: new fields.Typed({ type: "num", allowedTypes: ["num"], displayName: "Width", defaultVal: 8 }),
            group: new fields.ConfigNode({ type: DashboardGroup, displayName: 'Group' }),
        },

    })

    onInit() {
        init(this.RED.server, this.RED.settings)
    }

    async onMessage(msg, vals) {
        const imageEvent = {
            type: 'POPULATE',
            componentType: 'IMAGE',
            data: {
                src: vals.src,
                caption: vals.caption
            }
        }

        const _sockId = msg._sockId
        let socks = []
        if (_sockId) {
            socks = [_sockId]
        } else {
            socks = Object.keys(clients)
        }

        socks.forEach(sockId => {
            try {
                const sock = clients[sockId]
                if (!sock) {
                    return
                }
                sock.emit('dashboardDataUpdate', {
                    componentType: 'IMAGE',
                    componentId: `image:${this.redNode.id}`,
                    event: imageEvent,
                    sockId: sockId
                })
            } catch (e) {
                console.log('Unable to send template message', e)
            }
        })

        return null
    }
}

module.exports = DashboardImage