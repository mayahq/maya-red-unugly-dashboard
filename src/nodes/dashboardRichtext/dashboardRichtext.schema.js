const {
    Node,
    Schema,
    fields
} = require('@mayahq/module-sdk')
const { init, uiEventListener, clients } = require('../../util/socket')
const DashboardGroup = require('../dashboardGroup/dashboardGroup.schema')
const {marked} = require("marked")
const TurndownService = require("turndown")
const turndownService = new TurndownService()
const { convert } = require('html-to-text');

function escape(plaintext) {
    let html = '';
    let previousWasASpace = false;
    for (let index = 0; index < plaintext.length; index++) {
        let c = plaintext[index];
        if (c === ' ') {
            if (previousWasASpace) {
                html = html + '&nbsp;';
                previousWasASpace = false;
                continue;
            }
            previousWasASpace = true;
        } else {
            previousWasASpace = false;
        }
        switch (c) {
            case '<': {
                html = html + '&lt;';
                break;
            }
            case '>': {
                html = html + '&gt;';
                break;
            }
            case '&': {
                html = html + '&amp;';
                break;
            }
            case '"': {
                html = html + '&quot;';
                break;
            }
            case '\n': {
                html = html + '<br>';
                break;
            }
            case '\t': {
                html = html + '&nbsp; &nbsp; &nbsp; &nbsp';
                break;
            }
            default: {
                if (c.charCodeAt(0) < 128) {
                    html = html + c;
                } else {
                    html = html + '&#' + c.charCodeAt(0) + ';';
                }
            }
        }
    }
    return html;
};

function renderRichText(body, inputFormat) {
    switch (inputFormat) {
        case 'html': {
            return body;
        }
        case 'markdown': {
            return marked.parse(body);
        }
        case 'plaintext': {
            return escape(body);
        }
        default: {
            return body;
        }
    }
};
class DashboardRichtext extends Node {
    constructor(node, RED, opts) {
        super(node, RED, {
            ...opts,
            // masterKey: 'You can set this property to make the node fall back to this key if Maya does not provide one'
        })
    }

    static schema = new Schema({
        name: 'dashboard-richtext',
        label: 'Richtext editor',
        category: 'Maya Red Unugly Dashboard',
        isConfig: false,
        fields: {
            group: new fields.ConfigNode({ type: DashboardGroup, displayName: 'Group' }),
            alias: new fields.Typed({ type: "str", allowedTypes: ["str"], displayName: "Alias", defaultVal: 'myRichText' }),
            inputFormat: new fields.Select({ options: ['html', 'markdown', 'plaintext'], defaultVal: 'html', displayName: 'Input format'  }),
            outputFormat: new fields.Select({ options: ['html', 'markdown', 'plaintext'], defaultVal: 'html', displayName: 'Output format'  }),
            width: new fields.Typed({ type: "num", allowedTypes: ["num"], displayName: "Width", defaultVal: 8 }),
            passthru: new fields.Typed({type: 'bool', allowedTypes:["bool"], displayName: 'Output on change', defaultVal: "false"}),
            debounceBy: new fields.Typed({ type: 'num', allowedTypes: ['num'], defaultVal: 400, displayName: 'Time to wait before msg is sent'}),
            inputData: new fields.Typed({ type: "msg", allowedTypes: ["msg", "flow", "global"], defaultVal: "payload", displayName: "Editable data"}),
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

    onInit() {
        init(this.RED.server, this.RED.settings)

        uiEventListener.on(`richtext:${this.redNode.id}`, ({ event, _sockId }) => {
            const alias = this.getFieldValue('alias')
            const passthru = this.getFieldValue('passthru')
            const outputFormat = this.redNode.outputFormat

            if (event.type === 'bodyChange') {
                const { body } = event
                let outputBody;
                switch (outputFormat) {
                    case 'html': {
                        outputBody = body;
                        break;
                    }
                    case 'markdown': {
                        const markdownContent = turndownService.turndown(body);
                        outputBody =  markdownContent;
                        break;
                    }
                    case 'plaintext': {
                        // Not sure how well this will work
                        const plaintextContent = convert(body, {
                            wordwrap: 130
                        });
                        outputBody =  plaintextContent;
                        break;
                    }
                    default:
                        outputBody = body;
                }
    
                const globalContext = this.redNode.context().global
                const key = `richtext_${alias}`
                const context = globalContext.get(key)

                if (context?.payload) {
                    if (typeof context.payload === "string") {
                        let tmp = context.payload;
                        context.payload = {
                            old: tmp,
                            body : outputBody
                        }
                    } else if (typeof context.payload === "object") {
                        context.payload["body"] = outputBody
                    }
                }
                let modfiedContext = { ...context }
                globalContext.set(key, modfiedContext)

                if (passthru) {
                    this.redNode.send({ ...modfiedContext, _sockId })
                }
            }

            if (event.type === 'actionButtonClick') {
                const globalContext = this.redNode.context().global
                const key = `richtext_${alias}`
                const context = globalContext.get(key)
                
                this.redNode.send({ richtextContext: context, _sockId })
            }
        })
    }

    async onMessage(msg, vals) {
        let richtextEvent = null
        if (msg.event && msg.event.componentId === 'RICHTEXT') {
            richtextEvent = msg.event
        }

        if (!richtextEvent) {
            if (typeof vals.inputData === 'string') {
                richtextEvent = {
                    componentType: 'RICHTEXT',
                    type: 'POPULATE',
                    body: `${renderRichText(vals.inputData, vals.inputFormat)}`
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

        const globalContext = this.redNode.context().global
        const key = `richtext_${vals.alias}`
        const context = globalContext.get(key) || {}
        let modfiedContext = {...context, ...msg}
        
        globalContext.set(key, modfiedContext)

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