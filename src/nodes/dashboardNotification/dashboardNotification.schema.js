const {
    Node,
    Schema,
    fields
} = require('@mayahq/module-sdk')
const { clients, init } = require('../../util/socket')

const NOTIFICATION_STATUS_VALS = [
    'error',
    'info',
    'success',
    'warning'
]

const NOTIFICATION_PLACEMENT_VALS = [
    'bottom',
    'bottom-left',
    'bottom-right',
    'top',
    'top-left',
    'top-right'
]

class DashboardNotification extends Node {
    constructor(node, RED, opts) {
        super(node, RED, {
            ...opts,
            // masterKey: 'You can set this property to make the node fall back to this key if Maya does not provide one'
        })
    }

    static schema = new Schema({
        name: 'dashboard-notification',
        label: 'Notification',
        category: 'Maya Red Unugly Dashboard',
        isConfig: false,
        fields: {
            title: new fields.Typed({
                type: 'str',
                allowedTypes: ['str', 'msg', 'flow', 'global'],
                defaultVal: 'Title',
                displayName: 'Title'
            }),
            description: new fields.Typed({
                type: 'str',
                allowedTypes: ['str', 'msg', 'flow', 'global'],
                defaultVal: 'This is the notification description',
                displayName: 'Description'
            }),
            status: new fields.Select({
                options: NOTIFICATION_STATUS_VALS,
                defaultVal: 'info',
                displayName: 'Status'
            }),
            position: new fields.Select({
                options: NOTIFICATION_PLACEMENT_VALS,
                defaultVal: 'top-right',
                displayName: 'Position'
            })
        },

    })

    onInit() {
        // Do something on initialization of node
        // init()
        init(this.RED.server, this.RED.settings)
    }

    async onMessage(msg, vals) {
        console.log('Notification triggered')
        // Handle the message. The returned value will
        // be sent as the message to any further nodes.
        const _sockId = msg._sockId
        let socks = []
        if (_sockId) {
            socks = [_sockId]
        } else {
            socks = Object.keys(clients)
        }

        const notifEvent = {
            type: 'NOTIFY',
            componentType: 'NOTIFICATION',
            data: {
                title: vals.title,
                description: vals.description,
                status: vals.status,
                position: vals.position
            }
        }

        socks.forEach(sockId => {
            try {
                const sock = clients[sockId]
                if (!sock) {
                    return
                }
                sock.emit('dashboardDataUpdate', {
                    componentType: 'NOTIFICATION',
                    componentId: `notification:${this.redNode.id}`,
                    event: notifEvent,
                    sockId: sockId
                })
            } catch (e) {
                console.log('Unable to send template message', e)
            }
        })

        return null
    }
}

module.exports = DashboardNotification