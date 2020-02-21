var socket = io("/");

var myGames = [];       // Currently Not In Use
var username;           // init in login()
var activeUsers = [];   // init in socket.on('login')
var opponentName;       // invitee: init in handleOk()
                        // inviter: init in socket.on('response')
var isMyTurn;           // invitee: init in handleOk().
                        // inviter: init in socket.on('response')

var pawnType;
var opponentPosition;   // init in initGame()
var playerPosition;     // init in initGame()
var grid = [];          // init in initGame()
var neighbors;          // init in initGame()
var myWallCount;        // init in initGame()
var opponentWallCount;  // init in initGame()
var time;               // init in initGame()
var timeOut;            // init in initGame()




/********************************
 *      Socket.io handlers      *
 ********************************/

socket.on('login', function(data) {
    document.getElementById('page-login').style.display = 'none';
    document.getElementById('page-lobby').style.display = 'block';
    activeUsers = data.users;
    updateUserList();
});

socket.on('nameTaken', function(name) {
    alert(name + ' is currently taken. Please try another username.');
})

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
        socket.emit('leavelobby');
        isMyTurn = true;
        
        opponentName = data.opponentId;
        enterGamePage();
        startTimer();
    } else {
        console.log(data.opponentId + 'canceled');
        alert(data.opponentId + ' declined your invitation. :(');
        const playerButtons = document.getElementsByClassName('player-button');
        for (let i = 0; i < playerButtons.length; i++) {
            if (playerButtons[i].innerText === data.opponentId) {
                playerButtons[i].disabled = false;
                break;
            }
        }
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

socket.on('unavailable', function(opponentId) {
    alert(opponentId + " is currently unavailable.");
});

socket.on('available', function(opponentId) {
    socket.emit('leavelobby');
    opponentName = opponentId;
    
    isMyTurn = false;
    enterGamePage();
    // start opponent timer
    startTimer();
});

socket.on('exitGame', function(opponent) {
    alert(opponent + ' exited.');
    exitGamePage();
});

socket.on('rematch', function(opponent) {
    const rematchButton = document.getElementById('rematch');
    rematchButton.removeAttribute('onclick');
    promptRematch(opponent);
});

socket.on('rematchResponse', function(data) {
    const rematchButton = document.getElementById('rematch');
    rematchButton.setAttribute('onclick', 'rematch()');
    rematchButton.innerText = "Rematch"
    if (data.answer === true) {
        stopTimer();
        isMyTurn = true;
        enterGamePage();
        startTimer();
    } else {
        alert(opponentName + " declined. :(")
    }
})


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
            this.disabled = true;
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

    socket.emit('response', {inviter: username,
                             response: true});
}

const enterGamePage = function() {
    document.getElementById('page-lobby').style.display = 'none';
    document.getElementById('logo').style.display = 'none';
    initChat();
    initGame();
    document.getElementById('page-game').style.display = 'grid';
}

const quit = function() {
    socket.emit('exitGame', opponentName);
    exitGamePage();
}

const exitGamePage = function () {
    
    stopTimer();
    document.getElementById('opponent-timer').className = 'timer';
    document.getElementById('my-timer').className = 'timer';

    opponentName = '';
    document.getElementById('chat').innerHTML = '';
    document.getElementById('container-game').innerHTML = '';

    document.getElementById('page-game').style.display = 'none';
    document.getElementById('logo').style.display = 'block';
    document.getElementById('page-lobby').style.display = 'block';
    socket.emit('joinlobby', username);
}

const rematch = function () {
    const rematchButton = document.getElementById('rematch');
    rematchButton.removeAttribute('onclick');
    rematchButton.innerText = "Awaiting Response..."
    socket.emit('rematch', opponentName);
}

const promptRematch = function(username) {
    var dialogContainer = document.getElementById('container-dialog');

    var dialogMessage = document.createElement('P');
    dialogMessage.innerHTML = username + " requested a rematch.";

    var cancelButton = document.createElement('BUTTON');
    cancelButton.innerHTML = "Cancel";
    var okButton = document.createElement('BUTTON');
    okButton.innerHTML = "OK";

    cancelButton.addEventListener("click", function() {rematchCancel(username)});
    okButton.addEventListener("click", function() {rematchOk(username)});

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

const rematchCancel = function(username) {
    console.log('cancel ' + username);
    var dialogContainer = document.getElementById('container-dialog');
    dialogContainer.innerHTML = '';
    dialogContainer.display = 'none';

    const rematchButton = document.getElementById('rematch');
    rematchButton.setAttribute('onclick', 'rematch()');
    socket.emit('rematchResponse', {opponent: username, answer: false});
 }

const rematchOk = function(username) {
    console.log('ok ' + username);
    var dialogContainer = document.getElementById('container-dialog');
    dialogContainer.innerHTML = '';
    dialogContainer.display = 'none';

    const rematchButton = document.getElementById('rematch');
    rematchButton.setAttribute('onclick', 'rematch()');
    socket.emit('rematchResponse', {opponent: username, answer: true});
    stopTimer();
    isMyTurn = false;
    enterGamePage();
    startTimer();
}

/*********************************
 *             Chat              *
 *********************************/
const initChat = function() {
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
        sendMessage();
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

const sendMessage = function() {
    const message = document.getElementById('message');
    if(message.value.length > 0) {
        const p = document.createElement('P');
        p.setAttribute('class', 'myMessage');
        p.innerHTML = message.value;
        const output = document.getElementById("output");
        output.appendChild(p);
        output.scrollTop = output.scrollHeight;
        socket.emit('chat', {message: message.value, to: opponentName});
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
    gameContainer.innerHTML = '';
    gameContainer.appendChild(board);

    // place pawns
    document.getElementById('c-0-4').classList.add('opponentPawn');
    document.getElementById('c-8-4').classList.add('myPawn');
};

const initGame = function() {
    initBoard();
    grid = initGrid();
    myWallCount = 10;
    opponentWallCount = 10;
    time = 60;
    timeOut = false;
    opponentPosition = {x: 0, y: 8, row: 0, col: 4};
    playerPosition = {x:16, y: 8, row: 8, col: 4};
    neighbors = getPawnNeighbors(playerPosition.row, playerPosition.col);
    initGameInfo();
    addGameEventListeners();
}

const initGameInfo = function () {
    const opponentNameDisplay = document.getElementById('opponent-name');
    const opponentWallCountDisplay = document.getElementById('opponent-wallcount');
    const opponentTimerDisplay = document.getElementById('opponent-timer');

    const myNameDisplay = document.getElementById('my-name');
    const myWallCountDisplay = document.getElementById('my-wallcount');
    const myTimerDisplay = document.getElementById('my-timer');

    opponentNameDisplay.innerText = opponentName;
    opponentWallCountDisplay.innerText = opponentWallCount;
    opponentTimerDisplay.innerText = "01:00";

    myWallCountDisplay.innerText = myWallCount;
    myTimerDisplay.innerText = "01:00";

    // reset the class lists of timer and player name
    opponentNameDisplay.className = 'player-name';
    myNameDisplay.className = 'player-name';

    if(isMyTurn){
        myNameDisplay.classList.add('myTurn');
        myTimerDisplay.className = 'timer myTurn';
        opponentTimerDisplay.className = 'timer';
        opponentNameDisplay.classList.remove('myTurn');
        toggleNeighbor();
    } else {
        opponentNameDisplay.classList.add('myTurn');
        opponentTimerDisplay.className = 'timer myTurn';
        myTimerDisplay.className = 'timer';
        myNameDisplay.classList.remove('myTurn');
    }
}