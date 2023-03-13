const rowTypes = {
    KEY_VALUE_LIST: 'KEY_VALUE_LIST',
    FLAT_SPEC: 'FLAT_SPEC',
    TABLE_SPEC: 'TABLE_SPEC',
    INVALID: 'INVALID'
}

const primitives = ['string', 'number', 'boolean']
const commonIdNames = ['id', '_id', 'ID', '_ID', 'sno', 'pk', 'pid']

function resolveValue(val) {
    if (val === undefined || val === null) {
        return {
            type: 'string',
            value: 'N/A'
        }
    }

    if (primitives.includes(typeof val)) {
        return {
            type: typeof val,
            value: val
        }
    }

    if (typeof val === 'object' && Array.isArray(val)) {
        if (val.length === 0) {
            return {
                type: 'string',
                value: ''
            }
        }

        const newArr = val.slice(0, 3)
        if (newArr.every(v => primitives.includes(typeof v))) {
            return {
                type: 'string',
                value: newArr.map(v => v.toString()).join(', ') + `${val.length > 3 ? '...' : ''}`
            }
        }

        return {
            type: 'string',
            value: `List[${val.length}]`
        }
    } else if (typeof val === 'object' && !Array.isArray(val)) {
        return {
            type: 'string',
            value: `Object[${Object.keys(val).length} keys]`
        }
    }
}

function convertToTableRow(row) {
    if (typeof row !== 'object') {
        return rowTypes.INVALID
    }

    const tableRow = {
        _identifier: {
            type: 'random',
            value: Math.floor(Math.random() * 100000)
        },
        fields: {}
    }

    if (Array.isArray(row)) {
        row.forEach(v => {
            if (v.key && ['string', 'number'].includes(typeof v.key)) {
                let value = v.value
                if (!value) {
                    value = v.val
                }
                tableRow.fields[v.key.toString()] = resolveValue(value)
                if (
                    commonIdNames.includes(v.key) &&
                    ['string', 'number'].includes(typeof value)
                ) {
                    tableRow._identifier = {
                        type: 'random',
                        value: value
                    }
                }
            }
        })
    } else {
        if (row?._identifier?.type && row.fields) {
            // This is already table spec. Return the row as is
            return row
        }

        if (Object.values(row).every(v => v.type && v.value !== undefined)) {
            tableRow.fields = row
            return tableRow
        }

        // Assume flat spec
        Object.keys(row).forEach(fieldName => {
            tableRow.fields[fieldName] = resolveValue(row[fieldName])
            if (
                commonIdNames.includes(fieldName) &&
                ['string', 'number'].includes(typeof row[fieldName])
            ) {
                tableRow._identifier = {
                    type: 'random',
                    value: row[fieldName]
                }
            }
        })

    }
    return tableRow
}

module.exports = convertToTableRow