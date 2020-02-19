var socket = io("/");

var activeUsers = [];
var myGames = [];
var username;
var opponentName;

var pawnType;
var opponentPosition = {x: 0, y: 8, row: 0, col: 4};
var playerPosition = {x:16, y: 8, row: 8, col: 4};
var grid = [];
var isMyTurn = false;
var neighbors = [];
var myWallCount;
var opponentWallCount;
var time;
var timeOut;




/********************************
 *      Socket.io handlers      *
 ********************************/

socket.on('login', function(data) {
    activeUsers = data.users;
    updateUserList();

    myGames = data.games;
    //updateGamesList();
});

socket.on('joinlobby', function(newActiveUserId) {
    activeUsers.push(newActiveUserId);
    updateUserList();
});

socket.on('invite', function(inviterUsername) {
    console.log("hey" + inviterUsername);
    invitationHandler(inviterUsername);
});

socket.on('response', function(data) {
    if(data.answer === true) {
        console.log(data.opponentId + 'confirmed');
        isMyTurn = true;
        
        opponentName = data.opponentId;
        enterGamePage(data.opponentId);
        startTimer();
    } else {
        console.log(data.opponentId + 'canceled');
    }
});

socket.on('leavelobby', function(username) {
    for (var i = 0; i < activeUsers.length; i++) {
        if (activeUsers[i] === username) {
            activeUsers.splice(i, 1);
        }
    }
    updateUserList();
});

socket.on('chat', function(data) {
    var output = document.getElementById("output");
    const p = document.createElement('P');
    p.setAttribute('class', 'opponentMessage');
    p.innerHTML = '<strong>'+data.from+': </strong>' + data.message;
    output.appendChild(p);
    output.scrollTop = output.scrollHeight;
});


/*******************************
 *            Manus            *
 *******************************/

function login() {
    username = document.getElementById("username").value;
    console.log("login" + username.length);
    if (username.length > 0) {
        document.getElementById('userLabel').textContent = username;

        // emit to server
        socket.emit('login', username);
        document.getElementById('page-login').style.display = 'none';
        document.getElementById('page-lobby').style.display = 'block';
    }
}

const updateUserList = function() {
    const userList = document.getElementById('userList');
    userList.innerHTML = '';
    activeUsers.forEach(function(user) {
        // create a button for this active user
        var userBtn = document.createElement('BUTTON');
        userBtn.setAttribute('class', 'player-button');
        userBtn.innerHTML = user;
        // on click, send an invite to this user
        userBtn.addEventListener("click", function() {
            socket.emit('invite', user);
        });
        // append to DOM
        userList.appendChild(userBtn);
    });
    if (activeUsers.length === 0) {
        userList.innerHTML = '<p id="no-player">No players :(</p>';
    }
 }

const invitationHandler = function(inviterUsername) {
    console.log('handle ' + inviterUsername + "'s invite");
    displayConfirmDialog(inviterUsername);
 }

const displayConfirmDialog = function(username) {
    var dialogContainer = document.getElementById('container-dialog');

    var dialogMessage = document.createElement('P');
    dialogMessage.innerHTML = username + " invited you to a game.<br>Would you like to join?";

    var cancelButton = document.createElement('BUTTON');
    cancelButton.innerHTML = "Cancel";
    var okButton = document.createElement('BUTTON');
    okButton.innerHTML = "OK";

    cancelButton.addEventListener("click", function() {handleCancel(username)});
    okButton.addEventListener("click", function() {handleOk(username)});

    var containerBtns = document.createElement("DIV");
    containerBtns.setAttribute('id', 'dialog-options');
    containerBtns.appendChild(cancelButton);
    containerBtns.appendChild(okButton);

    var dialog = document.createElement('DIALOG');
    dialog.appendChild(dialogMessage);
    dialog.appendChild(containerBtns);

    dialogContainer.appendChild(dialog);
    dialogContainer.style.display = 'block';
 }

const handleCancel = function(username) {
    console.log('cancel ' + username);
    var dialogContainer = document.getElementById('container-dialog');
    dialogContainer.innerHTML = '';
    dialogContainer.display = 'none';
    socket.emit('response', {inviter: username,
                             response: false});
 }

const handleOk = function(username) {
    console.log('ok ' + username);
    var dialogContainer = document.getElementById('container-dialog');
    dialogContainer.innerHTML = '';
    dialogContainer.display = 'none';
    opponentName = username;
    
    isMyTurn = false;
    enterGamePage(username);
    // start opponent timer
    startTimer();
    socket.emit('response', {inviter: username,
                             response: true});
}

const enterGamePage = function(opponentId) {
    document.getElementById('page-lobby').style.display = 'none';
    document.getElementById('logo').style.display = 'none';
    initChat(opponentId);
    initGame(opponentId);
    document.getElementById('page-game').style.display = 'grid';
}

const exitGamePage = function () {
    socket.emit('login', username);
    stopTimer();

    document.getElementById('opponent-timer').className = 'timer';
    document.getElementById('my-timer').className = 'timer';

    opponentName = '';
    document.getElementById('chat').innerHTML = '';
    document.getElementById('container-game').innerHTML = '';

    document.getElementById('page-game').style.display = 'none';
    document.getElementById('logo').style.display = 'block';
    document.getElementById('page-lobby').style.display = 'block';
}

/*********************************
 *             Chat              *
 *********************************/
const initChat = function(opponentId) {
    // creating text input box
    var message = document.createElement("INPUT");
    message.setAttribute('id', 'message');
    message.setAttribute('placeholder', 'Type a message here');
    message.setAttribute('type', 'text');
    message.addEventListener('keyup', function(event) {
        // Number 13 is the "Enter" key on the keyboard
        if (event.keyCode === 13) {
            // Cancel the default action, if needed
            event.preventDefault();
            // Trigger the button element with a click
            document.getElementById("send").click();
        }
    });

    // creating send button
    var sendBtn = document.createElement("BUTTON");
    sendBtn.innerHTML = "Send"
    sendBtn.setAttribute('id', 'send');
    sendBtn.addEventListener('click', function(){
        sendMessage(opponentId);
    });

    // creating message output window
    var output = document.createElement("DIV");
    output.setAttribute('id', 'output');

    var feedback = document.createElement("DIV");
    feedback.setAttribute('id', 'feedback');

    var chatDisplayWindow = document.createElement("DIV");
    chatDisplayWindow.classList.add('chat-body');
    chatDisplayWindow.appendChild(output);
    chatDisplayWindow.appendChild(feedback);

    var chat = document.getElementById('chat');
    chat.innerHTML = '<h4 id="chat-header">Chat Room</h4>';
    chat.appendChild(chatDisplayWindow);
    chat.appendChild(message);
    chat.appendChild(sendBtn);
    
}

const sendMessage = function(opponentId) {
    const message = document.getElementById('message');
    if(message.value.length > 0) {
        const p = document.createElement('P');
        p.setAttribute('class', 'myMessage');
        p.innerHTML = message.value;
        const output = document.getElementById("output");
        output.appendChild(p);
        output.scrollTop = output.scrollHeight;
        socket.emit('chat', {message: message.value, to: opponentId});
        message.value = '';
    }
}



/********************************
 *             Game             *
 ********************************/
const initBoard = function() {
    const board = document.createElement('DIV');
    board.setAttribute('id', 'board');
    // constructing board elements
    for (let i = 0; i < 9; i++) {
        // a row of cells and vertical slots
        for(let j = 0; j < 9; j++) {
            const cell = document.createElement('DIV');
            cell.setAttribute('class', 'cell');
            cell.setAttribute('id', `c-${i}-${j}`);
            board.appendChild(cell);

            if (j < 8) {
                const slot = document.createElement('DIV');
                slot.setAttribute('class', 'slot vertical-slot');
                slot.setAttribute('id', `vs-${i}-${j}`);
                board.appendChild(slot);
            }
        }
        // a row of horizontal slots and square slots
        if (i < 8) {
            for (let j = 0; j < 9; j++) {
                const horSlot = document.createElement('DIV');
                horSlot.setAttribute('class', 'slot horizontal-slot');
                horSlot.setAttribute('id', `hs-${i}-${j}`);
                board.appendChild(horSlot);

                if (j < 8) {
                    const squSlot = document.createElement('DIV');
                    squSlot.setAttribute('class', 'slot square-slot');
                    squSlot.setAttribute('id', `ss-${i}-${j}`);
                    board.appendChild(squSlot);
                }
            }
        }
    }


    const gameContainer = document.getElementById('container-game');
    gameContainer.appendChild(board);

    // place pawns
    document.getElementById('c-0-4').classList.add('opponentPawn');
    document.getElementById('c-8-4').classList.add('myPawn');
};

const initGame = function(opponentId) {
    initBoard();
    grid = initGrid();
    myWallCount = 10;
    opponentWallCount = 10;
    time = 60;
    timeOut = false;
    neighbors = [];
    opponentPosition = {x: 0, y: 8, row: 0, col: 4};
    playerPosition = {x:16, y: 8, row: 8, col: 4};
    initGameInfo();
    addGameEventListeners();
    neighbors = getPawnNeighbors(playerPosition.row, playerPosition.col);
    if(isMyTurn){
        document.getElementById('my-name').classList.add('myTurn');
        document.getElementById('my-timer').className = 'timer myTurn';
        document.getElementById('opponent-timer').className = 'timer';
        document.getElementById('opponent-name').classList.remove('myTurn');
        toggleNeighbor();
    } else {
        document.getElementById('opponent-name').classList.add('myTurn');
        document.getElementById('opponent-timer').className = 'timer myTurn';
        document.getElementById('my-timer').className = 'timer';
        document.getElementById('my-name').classList.remove('myTurn');
    }
}

const initGameInfo = function () {
    document.getElementById('opponent-name').innerText = opponentName;
    document.getElementById('opponent-wallcount').innerText = opponentWallCount;
    document.getElementById('my-wallcount').innerText = myWallCount;
    document.getElementById('opponent-timer').innerText = "01:00";
    document.getElementById('my-timer').innerText = "01:00";
    document.getElementById('opponent-name').className = 'player-name';
    document.getElementById('my-name').className = 'player-name';
}