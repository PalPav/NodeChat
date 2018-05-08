const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

let passwords = {};
let status = {};
let sockets = {};

io.on('connection', function (socket) {

    const nickname = socket.handshake.query.nickname;
    const password = socket.handshake.query.password;

    if (!passwords[nickname]) {
        passwords[nickname] = password;
    }
    console.log(
        nickname,
        password,
        passwords,
        passwords[nickname] && passwords[nickname] === password
    );

    if (passwords[nickname] && passwords[nickname] === password) {

        if (status[nickname] && sockets[nickname]) {
            socket.disconnect(true);
            socket = sockets[nickname];
        } else {
            status[nickname] = true;
            sockets[nickname] = socket;
            socket.emit('success', {message: 'Подключение успешно'});
            io.emit('status', status);

            console.log(nickname + ' is connected');
            io.emit('system', nickname + ' заходит в чатик');

            socket.on('disconnect', function () {
                status[nickname] = false;
                sockets[nickname] = null;
                console.log(nickname + ' is disconnected');
                io.emit('system', nickname + ' вышел из чатика');
                io.emit('status', status);
            });

            socket.on('chat', function (data) {
                console.log('message: ', data);
                const date = new Date();
                let message = {
                    nickname: nickname,
                    message: data.message,
                    time: date.toLocaleTimeString(),
                    to: data.to,
                    direct: data.direct,
                };

                if (data.direct && data.to) {
                    if (status[data.to] && sockets[data.to]) {
                        sockets[data.to].emit('chat', message);
                        socket.emit('chat', message);
                    } else {
                        socket.emit('system', data.to + ' оффлайн');
                    }
                } else {
                    io.emit('chat', message);
                }
            });
        }
    } else {
        socket.emit('errors', {message: 'Не корректный пароль'});
        socket.disconnect(true);
    }

});


http.listen(3000, function () {
    console.log('listening on *:3000');
});