const path = require('path')
const socketio = require('socket.io');

let inited = false // true if the socket has been initialised
const sockpath = 'dashsock'

const clients = {}

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
    console.log('Creating socket on server', io, server)
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
    })

    inited = true
    console.log('Created socket on server')
}

module.exports = {
    init,
    clients
}