const express   = require('express');
const app       = express();
const socketioJwt = require('socketio-jwt');

var admin   = require('firebase-admin');
var axios   = require('axios');
var fs      = require('fs');
var https   = require('https');
var path    = require('path');
var env     = require('dotenv').config({path: __dirname + '/.env'});
var baseURI = process.env.BASE_URI;
var svcAcct = require(__dirname + process.env.FCM_KEY_PATH);

var options = {
    key     : fs.readFileSync(__dirname + '/tls/privkey.pem'),
    cert    : fs.readFileSync(__dirname + '/tls/fullchain.pem')
};

admin.initializeApp({
    credential  : admin.credential.cert(svcAcct),
    databaseURL : process.env.FCM_DB_URL
});

function logWebError(err, req, res, next) {
    logError(err);
    next();
}
app.use(logWebError);

app.use(express.static(__dirname + '/public'));
app.listen(3080, '0.0.0.0');

var server = https.createServer(options, app);
server.listen(3443);
var io = require('socket.io').listen(server, {
    pingInterval    : 30000,
    pingTimeout     : 10000,
});

try {
    io.use(socketioJwt.authorize({
        secret: process.env.JWT_SECRET,
        handshake: true,
    }));

    io.on('connect', function(socket) {
        const { dealer_id = false, user_id = false } = socket.decoded_token;
        var dealerRoom = 'dealer-' + dealer_id;
        var userRoom = 'user-' + user_id;

        socket.join([userRoom, dealerRoom]);

        if (dealer_id) {
            if (user_id) {
                io.to(dealerRoom).emit('sockets-updated:' + dealer_id, {});

                // axios.post(baseURI + 'hooks/user/socket/update', {
                //     socketId: socket.id,
                //     userId: user
                // }).then(function () {
                //     io.emit('sockets-updated:' + dealer, {});
                // }).catch(function (error) {
                //     logError(error);
                // });
            }

            socket.on('disconnect', function() {
                socket.leave(userRoom);
                socket.leave(dealerRoom);

                io.to(dealerRoom).emit('sockets-updated:' + dealer_id, {});

                // axios.post(baseURI + 'hooks/user/socket/update', {
                //     disconnect: true,
                //     group_id: dealer,
                //     socketId: socket.id
                // }).then(function () {
                //     io.emit('sockets-updated:' + dealer, {});
                // }).catch(function (error) {
                //     logError(error);
                // });
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
    var androidData;
    var iosData;
    var hasAndroidTargets = false;
    var hasIOSTargets = false;
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

    if (typeof message.data.recipients !== 'undefined') {
        var androidOptions = {
            list: true,
            recipients: []
        };
        var iosOptions = {
            list: true,
            recipients: []
        };

        for(var i in message.data.recipients) {
            if (typeof message.data.recipients[i]['os'] !== 'undefined') {
                if (message.data.recipients[i]['os'] === 'ANDROID') {
                    androidOptions.recipients.push(message.data.recipients[i]);
                    hasAndroidTargets = true;
                } else if (message.data.recipients[i]['os'] === 'IOS') {
                    iosOptions.recipients.push(message.data.recipients[i]);
                    hasIOSTargets = true;
                }
            }
        }

        if (hasAndroidTargets) {
            androidData = message || {};
            sendData(androidData, androidOptions);
        }

        if (hasIOSTargets) {
            iosData = message || {};
            sendDataMsg(message?.data?.title ?? null, message?.data?.body ?? null, iosData, iosOptions);
        }
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

async function sendData(message, options) {
    var data = JSON.parse(JSON.stringify(message.data));
    var event = message.event;
    var fcmOptions = {
        priority: 'high',
        timeToLive: 60 * 60 * 8,
    };

    if (typeof data.payload !== 'undefined') {
        delete data.payload;
    }

    if (typeof data.recipients !== 'undefined') {
        delete data.recipients;
    }

    if (typeof data.data !== 'undefined' && data.data !== null) {
        if (typeof data.data.recipients !== 'undefined') {
            delete data.data.recipients;
        }
    }

    var payload = {
        data: {
            refreshDash: 'true'
        }
    };

    if ((data.title !== null && data.title !== '') || (data.body !== null && data.body !== '')) {
        payload.data.body                   = data.body;
        // payload.data["content-available"]   = "1";
        payload.data.notId                  = data.NotID || (Math.random() * 10000).toFixed(0);
        payload.data.soundname              = "default";
        payload.data.title                  = data.title;
        payload.data.vibrate                = "true";
    }

    payload.data.event = event;

    for (var i in data) {
        payload.data[i] = data[i];
    }

    for (var i in payload.data) {
        if (typeof payload.data[i] !== 'string') {
            payload.data[i] = JSON.stringify((payload.data[i]));
        }
    }

    if (typeof data.data !== 'undefined') {
        for(var i in data.data) {
            if (typeof data.data[i] !== 'string') {
                payload.data[i] = JSON.stringify(data.data[i]);
            } else {
                payload.data[i] = data.data[i];
            }
        }
    }

    if (options.list === true) {
        for(var i = 0; i < options.recipients.length; i++) {
            sendToFCMDevice(options.recipients[i].push_id, payload, fcmOptions);
        }
    } else if (typeof options.topic !== 'undefined') {
        admin
            .messaging()
            .sendToTopic(options.topic, payload)
            .then(function(response) {
                console.log('Successfully sent message: ' + JSON.stringify(response));
            })
            .catch(function(error) {
                logError(error);
            });
    }
}

async function sendDataMsg(title, body, message, options) {
    var data = {};
    var event = message.event;
    var fcmOptions = {
        priority: 'high',
        timeToLive: 60 * 60 * 8,
    };

    if (typeof message.data.data !== 'undefined') {
        data = JSON.parse(JSON.stringify(message.data.data));
    }

    if (data === null) {
        data = {};
    }

    if (typeof data.recipients !== 'undefined') {
        delete data.recipients;
    }

    var payload = {
        data: data,
    };

    if (message?.data?.isNotificationSilentOnMobile) {
        fcmOptions.contentAvailable = true;
    }

    if (title && body) {
        payload.notification = {
            title,
            body,
            "sound": "default"
        };
    }

    for(var i in data) {
        if (typeof data[i] !== 'string') {
            payload.data[i] = JSON.stringify(data[i]);
        } else {
            payload.data[i] = data[i];
        }
    }

    payload.data.event = event;

    if (options.list === true) {
        for(var i = 0; i < options.recipients.length; i++) {
            sendToFCMDevice(options.recipients[i].push_id, payload, fcmOptions);
        }
    } else if (typeof options.topic !== 'undefined') {
        admin
            .messaging()
            .sendToTopic(options.topic, payload, fcmOptions)
            .then(function(response) {
                console.log('Successfully sent message: ' + JSON.stringify(response));
            })
            .catch(function(error) {
                logError(error);
            });
    }
}

function sendMsg(title, body, options) {
    var fcmOptions = {
        timeToLive: 60 * 60 * 8,
    };

    var payload = {
        notification: {
            title: title,
            body: body
        }
    };
    if (options.list === true) {
        for(var i = 0; i < options.recipients.length; i++) {
            sendToFCMDevice(options.recipients[i].push_id, payload, fcmOptions);
        }
    } else if (typeof options.topic !== 'undefined') {
        admin
            .messaging()
            .sendToTopic(options.topic, payload)
            .then(function(response) {
                console.log('Successfully sent message: ' + response);
            })
            .catch(function(error) {
                logError(error);
            });
    }
}

function sendToFCMDevice(RegId, payload, options) {
    admin
        .messaging()
        .sendToDevice(RegId, payload, options)
        .then(function (response) {
            if (response.failureCount === 1) {
                var code = response.results[0].error.code;
                if (code === 'messaging/registration-token-not-registered') {
                    axios
                        .post(baseURI + 'api/push/unregister', {
                            registration_id: RegId
                        })
                        .then(function () {
                            console.log('Removed invalid ' + RegId + ' successfully');
                        })
                        .catch(function (error) {
                            logError(error);
                        });
                } else {
                    logError(JSON.stringify(response.results[0].error));
                }
            } else if (response.successCount === 1) {
                console.log(RegId + ' messaged successfully');
            }
        })
        .catch(function(err) {
            logError(err);
        });
}
