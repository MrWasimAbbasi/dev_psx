const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const socketioJwt = require('socketio-jwt');
const env = require('dotenv').config({ path: __dirname + '/.env' });

app.use(express.static(__dirname + '/public'));

server.listen(3000, () => {
    console.log('listening on *:3000');
});

var io = require('socket.io').listen(server, {
    pingInterval    : 30000,
    pingTimeout     : 10000,
});

try {
    io.use(socketioJwt.authorize({
        secret: process.env.JWT_SECRET,
        handshake: true,
    }));

    io.on('connect', function (socket) {
        const { dealer_id = false, user_id = false } = socket.decoded_token;
        var dealerRoom = 'dealer-' + dealer_id;
        var userRoom = 'user-' + user_id;

        socket.join([userRoom, dealerRoom]);

        if (dealer_id) {
            if (user_id) {
                io.to(dealerRoom).emit('sockets-updated:' + dealer_id, {});
            }

            socket.on('disconnect', function () {
                socket.leave(userRoom);
                socket.leave(dealerRoom);

                io.to(dealerRoom).emit('sockets-updated:' + dealer_id, {});
            });
        }
    });
} catch (err) {
    logError(err);
}

var Redis = require('ioredis');
var conOpts = {
    port: process.env.REDIS_PORT,
    host: process.env.REDIS_HOST,
    family: process.env.REDIS_FAMILY,
    password: process.env.REDIS_PASSWORD,
    db: process.env.REDIS_DB
};

try {
    var redis = new Redis(conOpts);
} catch (err) {
    logError(err);
}

try {
    redis.psubscribe('*');
} catch (err) {
    logError(err);
}

redis.on('pmessage', function (pattern, channel, message) {
    var currentTime = new Date().getTime();
    message = JSON.parse(message);
    const { data: {
        broadcastRoom = null,
        recipients = []
    } } = message;

    if (recipients && recipients.length > 0) {
        for (const i in recipients) {
            const id = recipients[i]['id'];
            const userRoom = 'user-' + id;
            const timeFinished = new Date().getTime();

            message.data.timeStarted = currentTime;
            message.data.timeFinished = timeFinished;
            message.data.timeToSend = timeFinished - currentTime;

            const broadcastChannel = channel === 'users' ? 'user:' + id : channel;
            io.to(userRoom).emit(broadcastChannel, message);
        }
    } else {
        if (broadcastRoom) {
            io.to(broadcastRoom).emit(channel, message);
        } else {
            io.emit(channel, message);
        }
    }

    if (typeof message.data.web_only !== 'undefined') {
        delete message.data.web_only;
    }
});

function logError(err) {
    var d = new Date();
    var day = d.getDate();
    var hour = d.getHours();
    var minutes = d.getMinutes();
    var month = parseFloat(d.getMonth()) + 1;
    var seconds = d.getSeconds();
    var stamp;

    if (day < 10) {
        day = '0' + day;
    }

    if (hour < 10) {
        hour = '0' + hour;
    }

    if (minutes < 10) {
        minutes = '0' + minutes;
    }

    if (month < 10) {
        month = '0' + month;
    }

    if (seconds < 10) {
        seconds = '0' + seconds;
    }

    stamp = d.getFullYear() + '-' + month + '-' + day + ' ' + hour + ':' + minutes + ':' + seconds;

    console.log('[' + stamp + ']');
    console.log(err);
}
