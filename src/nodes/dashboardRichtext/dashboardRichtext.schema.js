const {
    Node,
    Schema,
    fields
} = require('@mayahq/module-sdk')
const { init, uiEventListener, clients } = require('../../util/socket')
const DashboardGroup = require('../dashboardGroup/dashboardGroup.schema')

class DashboardRichtext extends Node {
    constructor(node, RED, opts) {
        super(node, RED, {
            ...opts,
            // masterKey: 'You can set this property to make the node fall back to this key if Maya does not provide one'
        })
    }

    static schema = new Schema({
        name: 'dashboard-richtext',
        label: 'dashboard-richtext',
        category: 'Maya Red Unugly Dashboard',
        isConfig: false,
        fields: {
            alias: new fields.Typed({ type: "str", allowedTypes: ["str"], displayName: "Alias", defaultVal: 'myRichText' }),
            outputFormat: new fields.Select({ options: ['html', 'markdown', 'plaintext'], defaultVal: 'html', displayName: 'Output format'  }),
            width: new fields.Typed({ type: "num", allowedTypes: ["num"], displayName: "Width", defaultVal: 8 }),
            group: new fields.ConfigNode({ type: DashboardGroup, displayName: 'Group' }),
            debounceBy: new fields.Typed({ type: 'num', allowedTypes: ['num'], defaultVal: 400, displayName: 'Time to wait before msg is sent'})
        },

    })

    getFieldValue(fieldName) {
        const schema = this.constructor.schema
        const field = schema.fields[fieldName]
        if (!field.resolveValue) {
            return null
        }

        return field.resolveValue(this.RED, fieldName, this.redNode, null, {})
    }

    onInit() {
        init(this.RED.server, this.RED.settings)
        uiEventListener.on(`richtext:${this.redNode.id}`, ({ event, _sockId }) => {
            const alias = this.getFieldValue('alias')

            const { body, format } = event
            const flowContext = this.redNode.context().flow
            const key = `richtext_${alias}`
            flowContext.set(key, { body, format })

            this.redNode.send({ body: body, payload: body, _sockId })
        })
    }

    async onMessage(msg, vals) {
        let richtextEvent = null
        if (msg.event && msg.event.componentId === 'RICHTEXT') {
            richtextEvent = msg.event
        }

        if (!richtextEvent) {
            if (typeof msg.payload === 'string') {
                richtextEvent = {
                    componentType: 'RICHTEXT',
                    type: 'POPULATE',
                    body: `<p>${msg.payload}</p>`
                }
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
            const sock = clients[sockId]
            if (!sock) {
                return
            }
            sock.emit('dashboardDataUpdate', {
                componentType: 'RICHTEXT',
                componentId: `richtext:${this.redNode.id}`,
                event: richtextEvent,
                sockId: sockId
            })
        })

        return null
    }
}

module.exports = DashboardRichtext