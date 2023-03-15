const {
    Node,
    Schema,
    fields
} = require('@mayahq/module-sdk')
const { init, clients, uiEventListener } = require('../../util/socket')
const DashboardGroup = require('../dashboardGroup/dashboardGroup.schema')

// const buttonColorOpts = [
//     'blue',
//     'gray',
//     'green',
//     'orange',
//     'pink',
//     'red',
//     'teal',
//     'yellow',
//     'whiteAlpha',
//     'facebook',
//     // 'blackAlpha',
//     // 'cyan',
//     // 'linkedin',
//     // 'messenger',
//     // 'purple',
//     // 'telegram',
//     // 'twitter',
//     // 'whatsapp',
// ]

const buttonColorOpts = [
    'primary',
    'secondary',
    'danger'
]

const buttonStyles = [
    'solid',
    'ghost',
    'outline',
]

class DashboardButton extends Node {
    constructor(node, RED, opts) {
        super(node, RED, {
            ...opts,
            // masterKey: 'You can set this property to make the node fall back to this key if Maya does not provide one'
        })
    }

    static schema = new Schema({
        name: 'dashboard-button',
        label: 'Button',
        category: 'Maya Red Unugly Dashboard',
        isConfig: false,
        fields: {
            group: new fields.ConfigNode({ type: DashboardGroup, displayName: 'Group' }),
            width: new fields.Typed({ type: "num", allowedTypes: ["num"], displayName: "Width", defaultVal: 2 }),
            label: new fields.Typed({ type: "str", allowedTypes: ["str"], displayName: "Label", defaultVal: "Button" }),
            tooltip: new fields.Typed({ type: "str", allowedTypes: ["str"], displayName: "Tooltip", defaultVal: "" }),
            debounce: new fields.Typed({ type: 'num', allowedTypes: ['num'], displayName: 'Debounce', defaultVal: '0' }),
            loadingOnClick: new fields.Select({ options: ['yes', 'no'], defaultVal: 'yes', displayName: "Show loading on click" }),
            payloadOnClick: new fields.Typed({
                type: "flow", 
                allowedTypes: ["msg", "flow", "global", "str", "num", "bool", "json"], 
                displayName: "Payload to send on click", 
                defaultVal: "payload"
            }),
            color: new fields.Select({ options: buttonColorOpts, defaultVal: 'blue', displayName: 'Color' }),
            style: new fields.Select({ options: buttonStyles, defaultVal: 'solid', displayName: 'Style' }),
            placement: new fields.Select({ options: ['header', 'content', 'footer'], defaultVal: 'footer', displayName: 'Position in group' })
        },
    })

    onInit() {
        init(this.RED.server, this.RED.settings)

        console.log('redNode ID', this.redNode.id)

        uiEventListener.on(`button:${this.redNode.id}`, ({ event, _sockId }) => {
            console.log('we got a message', event)
            let payloadVal = null
            try {
                const schema = this.constructor.schema
                const val = schema.fields.payloadOnClick.resolveValue(
                    this.RED, 
                    'payloadOnClick',
                    this.redNode,
                    null,
                    {}
                )
                payloadVal = val
            } catch (e) {
                console.log('Unable to resolve payload value', e)
            }

            this.redNode.send({ event, _sockId, payload: payloadVal })
        })
    }

    async onMessage(msg, vals) {

        const buttonEvent = msg.buttonEvent

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
                    componentType: 'BUTTON',
                    componentId: `button:${this.redNode.id}`,
                    event: buttonEvent,
                    sockId: sockId
                })
            } catch (e) {
                console.log('Unable to send button message', e)
            }
        })

        return null

        return null
    }
}

module.exports = DashboardButton