var express = require('express');
var app = express();

app.use(express.static('public'));

var http = require('http').Server(app);
var port = process.env.PORT || 3000;
var io = require('socket.io')(http);

var lobbyUsers = {};
var users = {};

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/public/index.html');
});

io.on('connection', function(socket) {
    console.log('new connection' + socket);

    socket.on('login', function(userId) {
        doLogin(socket, userId);
    });

    function doLogin(socket, userId) {
        socket.userId = userId;
        console.log(socket.id);
        if(!users[userId]) {
            console.log("creating new user");
            users[userId] = {userId: socket.userId, socketId: socket.id, games:{}};
        } else {
            console.log('user found!');
            users[userId].socketId = socket.id;
        }

        // emit user info back to the user
        socket.emit('login', {users: Object.keys(lobbyUsers),
                              games: Object.keys(users[userId].games)});
        // add user to list of active users
        lobbyUsers[userId] = socket;
        // broadcast user to all active users
        socket.broadcast.emit('joinlobby', socket.userId);
    }

    socket.on('invite', function(opponentId) {
        console.log('got an invite from: ' + socket.userId + ' --> ' + opponentId);
        console.log(users[opponentId].socketId);
        // send invitation to opponent
        io.to(`${users[opponentId].socketId}`).emit('invite', socket.userId);
    });

    socket.on('response', function(data) {
        console.log(data.inviter);
        console.log(data.response);
        if(data.response === true){
            socket.broadcast.emit('leavelobby', data.inviter);
            socket.broadcast.emit('leavelobby', socket.userId);
            delete lobbyUsers[data.inviter];
            delete lobbyUsers[socket.userId];
        }
        io.to(`${users[data.inviter].socketId}`).emit('response', {opponentId: socket.userId,
                                                                   answer: data.response});
    });

    socket.on('chat', function(data) {
        console.log("got a message from: " + socket.userId + "--> " + data.to);
        // send message to opponent
        io.to(`${users[data.to].socketId}`).emit('chat', {message: data.message, from: socket.userId});
    });

    socket.on('move', function (data) {
        console.log(socket.userId + " made a move: " + data.pawnType + " (" + data.row + ", " + data.col + ")");
        var row, col;
        switch (data.pawnType) {
            case 'pawn':
                row = 8 - data.row;
                col = 8 - data.col;
                break;
            case 'vertical-wall':
                row = 9 - data.row;
                col = 7 - data.col;
                break;
            case 'horizontal-wall':
                row = 7 - data.row;
                col = 9 - data.col;
                break;
            default:;
        }
        io.to(`${users[data.opponentId].socketId}`).emit('move', {pawnType: data.pawnType, row, col});
    });
});

http.listen(port, function() {
    console.log('listening on *: ' + port);
});