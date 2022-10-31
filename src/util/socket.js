const path = require('path')
const socketio = require('socket.io');
const events = require('events')

let inited = false // true if the socket has been initialised
const sockpath = 'dashsock'

const clients = {}

const ev = new events.EventEmitter()

function init(server, redSettings) {
    if (inited) {
        return
    }

    const fullPath = path.join(redSettings.httpNodeRoot, sockpath)
    const socketIoPath = path.join(fullPath, 'socket.io')

    io = socketio(server, { 
        path: socketIoPath,
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    })
    console.log('Creating socket on server')
    io.on('connection', socket => {
        console.log('got connection')
        clients[socket.id] = socket
        socket.emit('connection::success', {
            socketId: socket.id
        })

        socket.on('ping', (data) => {
            console.log('ping data', data, socket.emit)
            socket.emit('pong', data)
        })

        socket.on('uiEvent', (data) => {
            console.log('got uiEvent', data)
            const { componentId, event } = data
            ev.emit(componentId, { event, _sockId: socket.id })
        })
    })

    inited = true
    console.log('Created socket on server')
}

module.exports = {
    init,
    clients,
    uiEventListener: ev
}