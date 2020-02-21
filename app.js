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
        // console.log(socket.id);
        if(!users[userId]) {
            console.log("userId available");
            users[userId] = {socketId: socket.id, game:{opponent: ''}};

            // emit user info back to the user
            socket.emit('login', {
                users: Object.keys(lobbyUsers),
            });
            // add user to list of active users
            lobbyUsers[userId] = socket;
            // broadcast user to all active users
            socket.broadcast.emit('joinlobby', socket.userId);
        } else {
            console.log('userId taken!');
            socket.emit('nameTaken', userId);
        }
    }

    socket.on('joinlobby', function(userId) {
        console.log(userId + " joined lobby");
        lobbyUsers[userId] = socket;
        socket.broadcast.emit('joinlobby', userId);
    });

    socket.on('leavelobby', function() {
        delete lobbyUsers[socket.userId];
        socket.broadcast.emit('leavelobby', socket.userId);
    });

    socket.on('invite', function(opponentId) {
        console.log('got an invite from: ' + socket.userId + ' --> ' + opponentId);
        // console.log(users[opponentId].socketId);
        // send invitation to opponent
        io.to(`${users[opponentId].socketId}`).emit('invite', socket.userId);
    });

    socket.on('response', function(data) {
        if (!lobbyUsers[data.inviter]) {
            if(data.response === true) {
                socket.emit('unavailable', data.inviter);
            }
            return;
        }

        // console.log(data.inviter);
        // console.log(data.response);
        if(data.response === true){
            users[socket.userId].game.opponent = data.inviter;
            users[data.inviter].game.opponent = socket.userId;
            socket.emit('available', data.inviter);
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

    socket.on('exitGame', function(opponent) {
        console.log(socket.userId + " exited");
        users[socket.userId].game.opponent = '';
        users[opponent].game.opponent = '';
        io.to(`${users[opponent].socketId}`).emit('exitGame', socket.userId);
    });

    socket.on('rematch', function(opponent) {
        io.to(`${users[opponent].socketId}`).emit('rematch', socket.userId);
    });

    socket.on('rematchResponse', function(data) {
        io.to(`${users[data.opponent].socketId}`).emit('rematchResponse', {opponentName: data.opponent, answer: data.answer});
    });

    socket.on('disconnect', function() {
        if (!users[socket.userId]) {
            return;
        }
        if (users[socket.userId].game.opponent !== '') {
            users[users[socket.userId].game.opponent].game.opponent = '';
            io.to(`${users[users[socket.userId].game.opponent].socketId}`).emit('exitGame', socket.userId);
        }
        delete lobbyUsers[socket.userId];
        delete users[socket.userId];
        socket.broadcast.emit('leavelobby', socket.userId);
    });
});

http.listen(port, function() {
    console.log('listening on *: ' + port);
});