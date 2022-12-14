const {
    Node,
    Schema,
    fields
} = require('@mayahq/module-sdk')
const Mustache = require('mustache')

const { clients, init, uiEventListener } = require('../../util/socket')
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
        label: 'Template',
        category: 'Maya Red Unugly Dashboard',
        isConfig: false,
        fields: {
            group: new fields.ConfigNode({ type: DashboardGroup, displayName: 'Group', required: false }),
            alias: new fields.Typed({ type: "str", allowedTypes: ["str"], displayName: "Alias", defaultVal: '1' }),
            title: new fields.Typed({ type: "str", allowedTypes: ["str"], displayName: "Title", defaultVal: 'Template' }),
            width: new fields.Typed({ type: "num", allowedTypes: ["num"], displayName: "Width", defaultVal: 8 }),
            templateBody: new fields.Typed({ type: "str", allowedTypes: ['str', 'msg', 'flow'], defaultVal: "hello", displayName: 'Template' }),
            values: new fields.Typed({ type: 'msg', allowedTypes: ['json', 'msg', 'flow'], defaultVal: 'payload', displayName: 'Variables' }),
            renderInDashboard: new fields.Select({ options: ['yes', 'no'], defaultVal: 'yes', displayName: 'Show in dashboard' }),
            actionButtonText: new fields.Typed({ type: "str", allowedTypes: ["str"], defaultVal: "Save", displayName: "Action button text" }),
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

    saveTemplate(templateVal) {
        const globalContext = this.redNode.context().global
        const alias = this.getFieldValue('alias')

        globalContext.set(`template_${alias}`, { template: templateVal })
    }

    onInit() {
        init(this.RED.server, this.RED.settings)
        const templateVal = this.getFieldValue('templateBody')
        this.saveTemplate(templateVal)
        const alias = this.getFieldValue('alias')

        uiEventListener.on(`template:${this.redNode.id}`, ({ event, _sockId }) => {
            if (event.type === 'actionButtonClick') {
                const globalContext = this.redNode.context().global
                const componentContext = globalContext.get(`template_${alias}`)
                this.redNode.send({
                    templateContext: componentContext,
                    _sockId
                })
            }
        })
    }

    async onMessage(msg, vals) {
        let output = 'Error rendering template'

        if (vals.renderInDashboard === 'no') {
            try {
                const template = vals.templateBody
                output = Mustache.render(template, vals.values || {})
                msg.templateValue = output
                return msg
            } catch (e) {
                console.log('Error rendering template:', e)
            }

            return
        }

        /**
         * If the template is to be rendered in the dashboard, we need
         * need to send back the output in a message
         */
        const _sockId = msg._sockId
        let socks = []
        if (_sockId) {
            socks = [_sockId]
        } else {
            socks = Object.keys(clients)
        }

        const templateEvent = {
            type: 'POPULATE',
            componentType: 'TEMPLATE',
            data: {
                body: vals.templateBody,
                variables: vals.values
            }
        }

        socks.forEach(sockId => {
            try {
                const sock = clients[sockId]
                if (!sock) {
                    return
                }
                sock.emit('dashboardDataUpdate', {
                    componentType: 'TEMPLATE',
                    componentId: `template:${this.redNode.id}`,
                    event: templateEvent,
                    sockId: sockId
                })
            } catch (e) {
                console.log('Unable to send template message', e)
            }
        })

        return null
    }
}

module.exports = DashboardTemplate