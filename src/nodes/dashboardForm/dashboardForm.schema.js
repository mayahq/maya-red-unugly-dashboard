const {
    Node,
    Schema,
    fields
} = require('@mayahq/module-sdk')
const DashboardGroup = require('../dashboardGroup/dashboardGroup.schema')
const { clients, uiEventListener, init } = require('../../util/socket')

const formColorOpts = [
    'blue',
    'gray',
    'green',
    'orange',
    'pink',
    'red',
    'teal',
    'yellow',
    'whiteAlpha',
    'facebook',
    // 'blackAlpha',
    // 'cyan',
    // 'linkedin',
    // 'messenger',
    // 'purple',
    // 'telegram',
    // 'twitter',
    // 'whatsapp',
]

class DashboardForm extends Node {
    constructor(node, RED, opts) {
        super(node, RED, {
            ...opts,
            // masterKey: 'You can set this property to make the node fall back to this key if Maya does not provide one'
        })
    }

    static schema = new Schema({
        name: 'dashboard-form',
        label: 'Form',
        category: 'Maya Red Unugly Dashboard',
        isConfig: false,
        fields: {
            group: new fields.ConfigNode({ type: DashboardGroup, displayName: 'Group' }),
            alias: new fields.Typed({ type: "str", allowedTypes: ["str"], displayName: "Alias", defaultVal: 'myTable' }),
            config: new fields.Typed({ type: "json", allowedTypes: ["json"], displayName: "Form fields", defaultVal: '{}' }),
            submitButtonLabel: new fields.Typed({ type: "str", allowedTypes: ["str"], displayName: "Sufieldsbmit button label", defaultVal: 'Submit' }),
            cancelButtonLabel: new fields.Typed({ type: "str", allowedTypes: ["str"], displayName: "Cancel button label", defaultVal: '' }),
            width: new fields.Typed({ type: "num", allowedTypes: ["num"], displayName: "Width", defaultVal: 8 }),
            // colorScheme: new fields.Select({ options: formColorOpts, defaultVal: 'blue', displayName: 'Color scheme' })
        },
    })

    onInit() {
        init(this.RED.server, this.RED.settings)
        uiEventListener.on(`form:${this.redNode.id}`, ({ event, _sockId }) => {
            const { type, formData } = event
            const payload = {}
            Object.keys(formData.fields).forEach(key => {
                payload[key] = formData.fields[key]?.value
            })
            const randomId = Date.now().toString(36)

            const row = formData
            if (!row._identifier) {
                row._identifier = {
                    type: "random",
                    value: randomId
                }
            }

            payload._identifier = row._identifier.value

            const msg = {
                payload: payload,
                rowData: [ row ],
                _sockId
            }

            this.redNode.send(msg)
        })
    }

    async onMessage(msg, vals) {
        const _sockId = msg._sockId
        let socks = []
        if (_sockId) {
            socks = [_sockId]
        } else {
            socks = Object.keys(clients)
        }

        let dataToPopulate = {}
        if (Array.isArray(msg.rowData) && msg.rowData.length > 0) {
            dataToPopulate = msg.rowData[0]
        } else if (msg.rowData && !Array.isArray(msg.rowData)) {
            dataToPopulate = msg.rowData
        } else if (Array.isArray(msg.table) && msg.table.length > 0) {
            dataToPopulate = msg.table[0]
        } else if (typeof msg.payload === 'object' && msg.payload !== null) {
            dataToPopulate = {
                _identifier: {
                    type: 'randomNumber',
                    value: Math.floor(10000 * Math.random())
                },
                fields: {}
            }

            Object.keys(msg.payload).forEach(fieldName => {
                const val = msg.payload[fieldName]
                if (['string', 'number', 'boolean'].includes(typeof val)) {
                    dataToPopulate.fields[fieldName] = {
                        type: typeof val,
                        value: val
                    }
                }
            })
        }

        if (Object.keys(dataToPopulate).length === 0) {
            return null
        }

        const event = {
            type: 'POPULATE',
            data: dataToPopulate
        }

        socks.forEach(sockId => {
            const sock = clients[sockId]
            if (!sock) {
                return
            }
            sock.emit('dashboardDataUpdate', {
                componentType: 'FORM',
                componentId: `form:${this.redNode.id}`,
                event: event,
                sockId: sockId
            })
        })

        return null
    }
}

module.exports = DashboardForm