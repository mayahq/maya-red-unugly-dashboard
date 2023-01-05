const {
    Node,
    Schema,
    fields
} = require('@mayahq/module-sdk')
const { init, clients, uiEventListener } = require('../../util/socket')
const DashboardGroup = require('../dashboardGroup/dashboardGroup.schema')

const colorSchemeOpts = [
    'blue',
    'gray',
    'green',
    'orange',
    'pink',
    'red',
    'teal',
    'yellow'
    // 'blackAlpha',
    // 'cyan',
    // 'linkedin',
    // 'messenger',
    // 'purple',
    // 'telegram',
    // 'twitter',
    // 'whatsapp',
]

class DashboardTable extends Node {
    constructor(node, RED, opts) {
        super(node, RED, {
            ...opts,
            // masterKey: 'You can set this property to make the node fall back to this key if Maya does not provide one'
        })
    }

    static schema = new Schema({
        name: 'dashboard-table',
        label: 'Table',
        category: 'Maya Red Unugly Dashboard',
        isConfig: false,
        fields: {
            group: new fields.ConfigNode({ type: DashboardGroup, displayName: 'Group' }),
            alias: new fields.Typed({ type: "str", allowedTypes: ["str"], displayName: "Alias", defaultVal: 'myTable' }),
            width: new fields.Typed({ type: "num", allowedTypes: ["num"], displayName: "Width", defaultVal: 8 }),
            truncateAfter: new fields.Typed({ type: "num", allowedTypes: ["num"], display: "Truncate after", defaultVal: -1 }),
            actionButtonLabel: new fields.Typed({ type: "str", allowedTypes: ["str"], displayName: "Action button label", defaultVal: 'Process' }),
            colorScheme: new fields.Select({ options: colorSchemeOpts, defaultVal: 'blue', displayName: 'Color scheme' })
            // Whatever custom fields the node needs.
        },
    })

    onInit() {
        init(this.RED.server, this.RED.settings)
        uiEventListener.on(`table:${this.redNode.id}`, ({ event, _sockId }) => {
            const schema = this.constructor.schema
            const alias = schema.fields.alias.resolveValue(
                this.RED, 
                'alias',
                this.redNode,
                null,
                {}
            )

            switch (event.type) {
                case 'rowClick': {
                    const { rowData, action } = event
                    const payload = {}
                    try {
                        Object.keys(rowData.fields).forEach(key => {
                            payload[key] = rowData.fields[key].value
                        })
                    } catch (e) {
                        // We don't know what'll be in rowData. We don't wanna crash the
                        // runtime in case of bad data, so this is a blanket try-catch
                    }
        
                    this.redNode.send({ rowData: [rowData], payload, action, _sockId })
                    break
                }
                case 'rowSelect': {
                    try {
                        const { rowIdentifier, selected } = event
                        const flowContext = this.redNode.context().flow
                        const key = `table_${alias}`
    
                        const tableData = flowContext.get(key) || {}
                        let selectedRows = tableData.selected || {}
                        if (rowIdentifier === 'all') {
                            if (!selected) {
                                selectedRows = {}
                            } else {
                                const presentRows = tableData.rows
                                presentRows.forEach((row) => selectedRows[row._identifier.value] = true)
                            }
                        } else {
                            if (!selected) {
                                delete selectedRows[rowIdentifier]
                            } else {
                                selectedRows[rowIdentifier] = true
                            }
                        }
    
                        tableData.selected = selectedRows
                        flowContext.set(key, tableData)
                        
                        const allRows = tableData.rows || []
                        const rowsToSend = allRows.filter((row) => selectedRows[row._identifier?.value])
                        this.redNode.send({ rowData: rowsToSend, _sockId, selectedRows })
                    } catch (e) {
                        console.log('Error updating selected rows in table context data')
                        // Don't want bad data to crash the entire runtime
                    }
                }
            }
        })
    }

    async onMessage(msg, vals) {
        let tableEvent = null
        if (msg.event && msg.event.componentType === 'TABLE') {
            tableEvent = msg.event
        }

        if (!tableEvent) {
            /**
             * Prioritizing msg.payload over msg.rowData for now because the
             * JSONSQL node gives out results in payload instead of rowData.
             */
            if (Array.isArray(msg.payload)) {
                try {
                    const rows = msg.payload.map((data, idx) => {
                        const row = {
                            _identifier: {
                                type: 'rowIndex',
                                value: idx
                            },
                            fields: {}
                        }

                        Object.keys(data).forEach(fieldName => {
                            row.fields[fieldName] = {
                                type: typeof data[fieldName],
                                value: data[fieldName]
                            }
                        })

                        return row
                    })

                    tableEvent = {
                        type: 'POPULATE',
                        data: rows
                    }
                } catch (e) {}
            } else if (Array.isArray(msg.rowData)) {
                tableEvent = {
                    type: 'POPULATE',
                    data: msg.rowData
                }
            }
        }

        /**
         * Maintaining table data in context
         */
        const flowContext = this.redNode.context().flow
        const key = `table_${vals.alias}`
        const tableData = flowContext.get(key) || {}

        if (tableEvent.type === 'POPULATE') {
            const newTableData = { ...tableData, rows: tableEvent.data, selected: {} }
            flowContext.set(key, newTableData)
        }
        if (tableEvent.type === 'ADD_ROWS') {
            let newRows = tableData.rows || []
            newRows = newRows.concat(tableEvent.data)
            const newTableData = { ...tableData, rows: newRows }
            flowContext.set(key, newTableData)
        }
        if (tableEvent.type === 'UPSERT_ROWS') {
            const currentRows = tableData.rows || []
            tableEvent.data.forEach(row => {
                const tableRow = currentRows.find(r => r._identifier.value === row._identifier.value)
                if (!tableRow) {
                    return currentRows.push(row)
                }

                Object.keys(row.fields).forEach(key => tableRow.fields[key] = row.fields[key])
            })
            flowContext.set(key, { ...tableData, rows: currentRows })
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