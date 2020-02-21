

/******************************
 *     Socket.io handlers     *
 ******************************/
socket.on('move', function(data) {
    switch (data.pawnType) {
        case 'pawn':
            var gridX = data.row * 2;
            var gridY = data.col * 2;
            document.getElementById(`c-${opponentPosition.row}-${opponentPosition.col}`).classList.remove('opponentPawn');
            document.getElementById(`c-${data.row}-${data.col}`).classList.add('opponentPawn');
            opponentPosition = {x: gridX, y: gridY, row: data.row, col: data.col};
            if (isGameOver(data.row, 8)) {
                displayLose();
                return;
            }
            break;
        case 'horizontal-wall':
            var i = data.row;
            var j = data.col;
            var gridX = i * 2 + 1;
            var gridY = j * 2;
            document.getElementById(`hs-${i}-${j}`).classList.add('isWall');
            document.getElementById(`hs-${i}-${j-1}`).classList.add('isWall');
            document.getElementById(`ss-${i}-${j-1}`).classList.add('isWall');
            grid[i*2+1][j*2].isWall = true;
            grid[i*2+1][(j-1)*2].isWall = true;
            opponentWallCount--;
            document.getElementById('opponent-wallcount').innerText = opponentWallCount;
            break;
        case 'vertical-wall':
            var i = data.row;
            var j = data.col;
            var gridX = i * 2;
            var gridY = j * 2 + 1;
            document.getElementById(`vs-${i}-${j}`).classList.add('isWall');
            document.getElementById(`vs-${i-1}-${j}`).classList.add('isWall');
            document.getElementById(`ss-${i-1}-${j}`).classList.add('isWall');
            grid[i*2][j*2+1].isWall = true;
            grid[(i-1)*2][j*2+1].isWall = true;
            opponentWallCount--;
            document.getElementById('opponent-wallcount').innerText = opponentWallCount;
            break;
        default:;
    }
    neighbors = getPawnNeighbors(playerPosition.row, playerPosition.col);
    toggleNeighbor();
    // stop opponent timer
    stopTimer();
    isMyTurn = true;
    startTimer();
    document.getElementById('opponent-name').classList.remove('myTurn');
    document.getElementById('opponent-timer').classList.remove('myTurn');
    document.getElementById('my-name').classList.add('myTurn');
    document.getElementById('my-timer').classList.add('myTurn');
});

/******************************
 *     Add Event Listeners    *
 ******************************/
const addGameEventListeners = function() {
    // add event listener to every cell
    const cells = document.getElementsByClassName('cell');
    for(let i = 0; i < cells.length; i++){
        const cellId = cells[i].id.split('-');
        const boardX = Number(cellId[1]);
        const boardY = Number(cellId[2]);
        cells[i].addEventListener('click', function() {
            if (isMyTurn) {
                // pawnType = 'pawn'
                // console.log(pawnType);
                // console.log("("+ cellId[1] + ", " + cellId[2] + ")");
                if (isValidPawnMove(boardX, boardY)) {
                    console.log('valid pawn move');
                    // clear neighbors
                    toggleNeighbor();
                    // remove and place the pawn to new position
                    document.getElementById(`c-${playerPosition.row}-${playerPosition.col}`).classList.remove('myPawn');
                    cells[i].className = 'cell myPawn';
                    // update pawn position
                    playerPosition = {x: boardX*2, y: boardY*2, row: boardX, col: boardY};
                    // stop my timer
                    stopTimer();
                    isMyTurn = false;

                    document.getElementById('opponent-name').classList.add('myTurn');
                    document.getElementById('opponent-timer').classList.add('myTurn');
                    document.getElementById('my-name').classList.remove('myTurn');
                    document.getElementById('my-timer').classList.remove('myTurn');
                    socket.emit('move', {pawnType: 'pawn',
                                         row: boardX,
                                         col: boardY,
                                         opponentId: opponentName});
                    // check if game over
                    if (isGameOver(boardX, 0)) {
                        displayWin();
                    } else {
                        // start opponent timer
                        startTimer();
                    }
                }

            }            
        });
        cells[i].addEventListener('mouseenter', function() {
            if (isMyTurn && isValidPawnMove(boardX, boardY)) {
                //cells[i].classList.remove('neighbor');
                cells[i].classList.add('cell-hover'); 
            }
        });
        cells[i].addEventListener('mouseleave', function() {
            if (isMyTurn && isValidPawnMove(boardX, boardY)) {
                cells[i].classList.remove('cell-hover');
                //cells[i].classList.add('neighbor'); 
            }
        });
    }

    // add event listener to horizontal slots
    for(let i = 0; i < 8; i++) {
        for(let j = 1; j < 9; j++) {
            const hs = document.getElementById(`hs-${i}-${j}`);
            hs.addEventListener('click', function() {
                // pawnType = 'horizontal-wall';
                // console.log(pawnType + " ("+ i + ", " + j + ")");
                if (isMyTurn && myWallCount > 0 && isValidHorizontalWallMove(i, j)) {
                    // add wall to the board
                    document.getElementById(`hs-${i}-${j}`).classList.add('isWall');
                    document.getElementById(`hs-${i}-${j-1}`).classList.add('isWall');
                    document.getElementById(`ss-${i}-${j-1}`).classList.add('isWall');
                    // add wall to the grid
                    grid[i*2+1][j*2].isWall = true;
                    grid[i*2+1][(j-1)*2].isWall = true;
                    // decreament my wall count
                    myWallCount--;
                    // display new wall count
                    document.getElementById('my-wallcount').innerText = myWallCount;
                    // clear neighbors
                    toggleNeighbor();
                    // stop my timer
                    stopTimer();
                    isMyTurn = false;
                    // start opponent's timer
                    startTimer();
                    socket.emit('move', {pawnType: 'horizontal-wall',
                                         row: i,
                                         col: j,
                                         opponentId: opponentName});
                }

            });
            hs.addEventListener("mouseenter", function() {
                if(!isMyTurn || myWallCount === 0) return;
                if (isValidHorizontalWallMove(i, j)) {
                    document.getElementById(`hs-${i}-${j}`).classList.add('slot-valid-hover');
                    document.getElementById(`hs-${i}-${j-1}`).classList.add('slot-valid-hover');
                    document.getElementById(`ss-${i}-${j-1}`).classList.add('slot-valid-hover');
                } else {
                    document.getElementById(`hs-${i}-${j}`).classList.add('slot-invalid-hover');
                    document.getElementById(`hs-${i}-${j-1}`).classList.add('slot-invalid-hover');
                    document.getElementById(`ss-${i}-${j-1}`).classList.add('slot-invalid-hover');
                }

            });
            hs.addEventListener('mouseleave', function() {
                if(!isMyTurn || myWallCount === 0) return;
                if (isValidHorizontalWallMove(i, j)) {
                    document.getElementById(`hs-${i}-${j}`).classList.remove('slot-valid-hover');
                    document.getElementById(`hs-${i}-${j-1}`).classList.remove('slot-valid-hover');
                    document.getElementById(`ss-${i}-${j-1}`).classList.remove('slot-valid-hover');
                } else {
                    document.getElementById(`hs-${i}-${j}`).classList.remove('slot-invalid-hover');
                    document.getElementById(`hs-${i}-${j-1}`).classList.remove('slot-invalid-hover');
                    document.getElementById(`ss-${i}-${j-1}`).classList.remove('slot-invalid-hover');
                }
            });

        }
    }

    // add event listener to vertical slots
    for (let i = 1; i < 9; i++) {
        for (let j = 0; j < 8; j++) {
            //console.log(i + " " + j)
            const vs = document.getElementById(`vs-${i}-${j}`);
            vs.addEventListener('click', function() {
                // pawnType = 'vertical-wall';
                // console.log(pawnType + " ("+ i + ", " + j + ")");
                if (isMyTurn && myWallCount > 0 && validateVerticalWallMove(i, j)) {
                    // put wall on the board
                    document.getElementById(`vs-${i}-${j}`).classList.add('isWall');
                    document.getElementById(`vs-${i-1}-${j}`).classList.add('isWall');
                    document.getElementById(`ss-${i-1}-${j}`).classList.add('isWall');
                    // put wall on the grid
                    grid[i*2][j*2+1].isWall = true;
                    grid[(i-1)*2][j*2+1].isWall = true;
                    // decrement my wall count
                    myWallCount--;
                    // display new wall count
                    document.getElementById('my-wallcount').innerText = myWallCount;
                    // clear the neighbors
                    toggleNeighbor();
                    // stop my timer
                    stopTimer();
                    isMyTurn = false;
                    // start opponent timer
                    startTimer();
                    socket.emit('move', {pawnType: 'vertical-wall',
                                         row: i,
                                         col: j,
                                         opponentId: opponentName});
                }

            });
            vs.addEventListener("mouseenter", function() {
                if(!isMyTurn || myWallCount === 0) return;
                if (validateVerticalWallMove(i, j)) {
                    document.getElementById(`vs-${i}-${j}`).classList.add('slot-valid-hover');
                    document.getElementById(`vs-${i-1}-${j}`).classList.add('slot-valid-hover');
                    document.getElementById(`ss-${i-1}-${j}`).classList.add('slot-valid-hover');
                } else {
                    document.getElementById(`vs-${i}-${j}`).classList.add('slot-invalid-hover');
                    document.getElementById(`vs-${i-1}-${j}`).classList.add('slot-invalid-hover');
                    document.getElementById(`ss-${i-1}-${j}`).classList.add('slot-invalid-hover');
                }

            });
            vs.addEventListener('mouseleave', function() {
                if(!isMyTurn || myWallCount === 0) return;
                if (validateVerticalWallMove(i, j)) {
                    document.getElementById(`vs-${i}-${j}`).classList.remove('slot-valid-hover');
                    document.getElementById(`vs-${i-1}-${j}`).classList.remove('slot-valid-hover');
                    document.getElementById(`ss-${i-1}-${j}`).classList.remove('slot-valid-hover');
                } else {
                    document.getElementById(`vs-${i}-${j}`).classList.remove('slot-invalid-hover');
                    document.getElementById(`vs-${i-1}-${j}`).classList.remove('slot-invalid-hover');
                    document.getElementById(`ss-${i-1}-${j}`).classList.remove('slot-invalid-hover');
                }

            });
        }
    }
}

/**************************
 *       Game Logic       *
 **************************/

 // this function checks whether the given position is a valid pawn or not
 // returns true is valid, else returns false
const isValidPawnMove = function(positionX, positionY) {
    //console.log(JSON.stringify)
    //const neighbors = getPawnNeighbors(playerPosition.row, playerPosition.col);
    //console.log(JSON.stringify(neighbors));
    for (let i = 0; i < neighbors.length; i++) {
        if (neighbors[i].x === positionX && neighbors[i].y === positionY) {
            return true;
        }
    }
    return false;
}

// this function toggles the display of neighbors
const toggleNeighbor = function() {
    //neighbors = getPawnNeighbors(playerPosition.row, playerPosition.col);
    //color neighbors on the board
    for (let i = 0; i < neighbors.length; i++) {
        const neighbor = document.getElementById(`c-${neighbors[i].x}-${neighbors[i].y}`);
        neighbor.classList.toggle('neighbor');
    }
}

// this function finds the neighbor of the given pawn position
// returns a list of neighbors
const getPawnNeighbors = function(i, j) {
    const neighbors = [];
    // check top neighbors
    if (i !== 0) {
        const topWall = document.getElementById(`hs-${i-1}-${j}`);
        if (!topWall.classList.contains('isWall')) {
            const topCell = document.getElementById(`c-${i-1}-${j}`);
            // if top cell is available
            if (!topCell.classList.contains('opponentPawn')) {
                neighbors.push({x: i-1, y: j});
            } else {
                // if opponent is at top cell check for jump
                // check top
                if (i-1 != 0 && !document.getElementById(`hs-${i-2}-${j}`).classList.contains('isWall')) {
                    neighbors.push({x: i-2, y: j});
                } else {
                    // check top left
                    if (j != 0 && !document.getElementById(`vs-${i-1}-${j-1}`).classList.contains('isWall')) {
                        neighbors.push({x: i-1, y: j-1});
                    }
                    // check top right
                    if (j < 8 && !document.getElementById(`vs-${i-1}-${j}`).classList.contains('isWall')) {
                        neighbors.push({x: i-1, y: j+1});
                    }
                }
            }
        }
    }

    // check bottom neighbors
    if (i < 8) {
        const bottomWall = document.getElementById(`hs-${i}-${j}`);
        if (!bottomWall.classList.contains('isWall')) {
            const bottomCell = document.getElementById(`c-${i+1}-${j}`);
            // if bottom cell is available
            if (!bottomCell.classList.contains('opponentPawn')) {
                neighbors.push({x: i+1, y: j});
            } else {
                // if opponent is at bottom cell, check for jump
                // check bottom
                if (i + 1 < 8 && !document.getElementById(`hs-${i+1}-${j}`).classList.contains('isWall')) {
                    neighbors.push({x: i + 2, y: j});
                } else {
                    // check botttom left
                    if (j != 0 && !document.getElementById(`vs-${i+1}-${j-1}`).classList.contains('isWall')) {
                        neighbors.push({x: i+1, y: j-1});
                    }
                    // check bottom right
                    if (j < 8 && !document.getElementById(`vs-${i+1}-${j}`).classList.contains('isWall')) {
                        neighbors.push({x: i+1, y: i+1});
                    }
                }
            }
        }
    }

    // check left neighbors
    if (j > 0) {
        const leftWall = document.getElementById(`vs-${i}-${j-1}`);
        if (!leftWall.classList.contains('isWall')) {
            const leftCell = document.getElementById(`c-${i}-${j-1}`);
            // if left cell is available
            if (!leftCell.classList.contains('opponentPawn')) {
                neighbors.push({x: i, y: j-1});
            } else {
                // if opponent is at left cell, check for jump
                // check left
                if (j-1 > 0 && !document.getElementById(`vs-${i}-${j-2}`).classList.contains('isWall')) {
                    neighbors.push({x: i, y: j-2});
                } else {
                    // check left top
                    if (i > 0 && !document.getElementById(`hs-${i-1}-${j-1}`).classList.contains('isWall')) {
                        neighbors.push({x: i-1, y: j-1});
                    }
                    // check left bottom
                    if (i < 8 && !document.getElementById(`hs-${i}-${j-1}`).classList.contains('isWall')) {
                        neighbors.push({x: i+1, y: j-1});
                    }
                }
            }
        }
    }

    // checl right neighbors
    if (j < 8) {
        const rightWall = document.getElementById(`vs-${i}-${j}`);
        if (!rightWall.classList.contains('isWall')) {
            const rightCell = document.getElementById(`c-${i}-${j+1}`);
            // if right cell is available
            if (!rightCell.classList.contains('opponentPawn')) {
                neighbors.push({x: i, y: j+1});
            } else {
                // if opponent is at right cell, check for jump
                // check right
                if (j + 1 < 8 && !document.getElementById(`vs-${i}-${j+1}`).classList.contains('isWall')) {
                    neighbors.push({x: i, y: j+2});
                } else {
                    // check right top
                    if (i > 0 && !document.getElementById(`hs-${i-1}-${j+1}`).classList.contains('isWall')) {
                        neighbors.push({x: i-1, y: j+1});
                    }
                    // check right bottom
                    if (i < 8 && !document.getElementById(`hs-${i}-${j+1}`).classList.contains('isWall')) {
                        neighbors.push({x: i+1, y: j+1});
                    }
                }
            }
        }
    }

    return neighbors;
}

// this function checks whether the given position is a valid horizontal wall move or not
// returns true is valid, else return false
const isValidHorizontalWallMove = function(i, j) {
    // the wall is broken up into 3 parts
    const firstHalf = document.getElementById(`hs-${i}-${j-1}`);
    const middlePiece = document.getElementById(`ss-${i}-${j-1}`);
    const secondHalf = document.getElementById(`hs-${i}-${j}`);
    // check whether slots are occupied
    if(firstHalf.classList.contains('isWall') || middlePiece.classList.contains('isWall') || secondHalf.classList.contains('isWall')) {
        return false;
    } else {
        // check whether there is still a path to win for both player
        return hasPath('horizontal-wall', i, j);
    }
}

// this function checks whether the given position is a valid vertical wall move or not
// returns true is valid, else return false
const validateVerticalWallMove = function(i, j) {
    // the wall is broken up into 3 parts
    const firstHalf = document.getElementById(`vs-${i-1}-${j}`);
    const middlePiece = document.getElementById(`ss-${i-1}-${j}`);
    const secondHalf = document.getElementById(`vs-${i}-${j}`);
    if(firstHalf.classList.contains('isWall') || middlePiece.classList.contains('isWall') || secondHalf.classList.contains('isWall')) {
        return false;
    } else {
        return hasPath('vertical-wall', i, j);
    }
}

// this function creates a new grid
const initGrid = function() {
    const newGrid = [];
    for (let i = 0; i < 17; i++) {
        const row = [];
        for(let j = 0; j < 17; j++) {
            row.push(createNode(i, j));
        }
        newGrid.push(row);
    }
    console.log("Grid initialized");
    return newGrid;
}
// this is a helper function for initGrid(). it creates a new node for the grid.
const createNode = function (i, j) {
    const isMyGoal = (i === 0) ? true : false;
    const isOpponentGoal = (i === 16) ? true : false;
    return ({
        x: i,
        y: j,
        isVisited: false,
        isWall: false,
        isMyGoal,
        isOpponentGoal,
    });
}

// this is a helper function for isValidHorizontalWallMove() and validateVerticalWallMove()
// returns true is both side have a path to win, else return false
const hasPath = function (pawnType, i, j) {
    // make deep copys of the grid
    const gridCopy1 = JSON.parse(JSON.stringify(grid));
    const gridCopy2 = JSON.parse(JSON.stringify(grid));


    // make the move in grid copy
    switch (pawnType) {
        case 'horizontal-wall':
            gridCopy1[i*2+1][j*2].isWall = true;
            gridCopy1[i*2+1][(j-1)*2].isWall = true;
            gridCopy2[i*2+1][j*2].isWall = true;
            gridCopy2[i*2+1][(j-1)*2].isWall = true;
            break;
        case 'vertical-wall':
            gridCopy1[i*2][j*2+1].isWall = true;
            gridCopy1[(i-1)*2][j*2+1].isWall = true;
            gridCopy2[i*2][j*2+1].isWall = true;
            gridCopy2[(i-1)*2][j*2+1].isWall = true;
        default:;
    }

    // do BFS on opponent
    opponentTargetRow = 16;
    playerTargetRow = 0;
    const isReachableOpponent = bfs(opponentPosition, gridCopy1, opponentTargetRow);
    const isReachablePlayer = bfs(playerPosition, gridCopy2, playerTargetRow);

    return (isReachableOpponent && isReachablePlayer);
}

// this is a helper function for hasPath()
// do bfs on the given position, and returns a boolean value
// to indicate whether the target row is reachable
// return true is reachable else return false
const bfs = function (start, grid, targetRow) {
    queue = [];
    grid[start.x][start.y].isVisited = true;
    queue.push(grid[start.x][start.y]);
    while (queue.length !== 0) {
        const currentNode = queue.shift();
        const unvisitedNeighbors = getUnvisitedNeighbors(grid, currentNode);
        while (unvisitedNeighbors.length !== 0) {
            const neighbor = unvisitedNeighbors.shift();
            if (neighbor.x === targetRow) {
                return true;
            }
            neighbor.isVisited = true;
            queue.push(neighbor);
        }
    }
    return false;
}

// this is a bfs helper function, it returns
// unvisited neighbors of a given node in the grid
const getUnvisitedNeighbors = function (grid, node) {
    const neighbors = [];
    const {x, y} = node;
    // check top neighbor
    if (x >= 2 && grid[x-1][y].isWall === false && grid[x-2][y].isVisited === false) {
        neighbors.push(grid[x-2][y]);
    }
    // check bottom neighbor
    if (x <= 14 && grid[x+1][y].isWall === false && grid[x+2][y].isVisited === false) {
        neighbors.push(grid[x+2][y]);
    }
    // check left neighbor
    if (y >= 2 && grid[x][y-1].isWall === false && grid[x][y-2].isVisited === false) {
        neighbors.push(grid[x][y-2]);
    }
    // check right neighbor
    if (y <= 14 && grid[x][y+1].isWall === false && grid[x][y+2].isVisited === false) {
        neighbors.push(grid[x][y+2]);
    }
    return neighbors;
}

// this function check whether the given row position is the target row
// return true if it is else return false
const isGameOver = function (boardX, targetRow) {
    return boardX === targetRow;
}

// this function display win on the board
const displayWin = function() {
    // clear all the wall
    const slots = document.getElementsByClassName('slot');
    for (let i = 0; i < slots.length; i++) {
        slots[i].classList.remove("isWall");
        slots[i].classList.remove("slot-valid-hover");
    }
    // draw w
    document.getElementById('vs-3-0').classList.add("isWall");
    document.getElementById('ss-3-0').classList.add("isWall");
    document.getElementById('vs-4-0').classList.add("isWall");
    document.getElementById('hs-4-1').classList.add("isWall");
    document.getElementById('vs-4-1').classList.add("isWall");
    document.getElementById('ss-3-1').classList.add("isWall");
    document.getElementById('hs-4-2').classList.add("isWall");
    document.getElementById('vs-4-2').classList.add("isWall");
    document.getElementById('ss-3-2').classList.add("isWall");
    document.getElementById('vs-3-2').classList.add("isWall");

    // draw I
    document.getElementById('hs-2-4').classList.add("isWall");
    document.getElementById('ss-2-4').classList.add("isWall");
    document.getElementById('hs-2-5').classList.add("isWall");
    document.getElementById('vs-3-4').classList.add("isWall");
    document.getElementById('ss-3-4').classList.add("isWall");
    document.getElementById('vs-4-4').classList.add("isWall");
    document.getElementById('hs-4-4').classList.add("isWall");
    document.getElementById('ss-4-4').classList.add("isWall");
    document.getElementById('hs-4-5').classList.add("isWall");

    // draw N
    document.getElementById('ss-4-6').classList.add("isWall");
    document.getElementById('vs-4-6').classList.add("isWall");
    document.getElementById('ss-3-6').classList.add("isWall");
    document.getElementById('vs-3-6').classList.add("isWall");
    document.getElementById('hs-2-7').classList.add("isWall");
    document.getElementById('vs-3-7').classList.add("isWall");
    document.getElementById('ss-3-7').classList.add("isWall");
    document.getElementById('vs-4-7').classList.add("isWall");
    document.getElementById('ss-4-7').classList.add("isWall");
    document.getElementById('ss-2-6').classList.add("isWall");
};

// this function display lose on the board
const displayLose = function () {
    // clear all the wall
    const slots = document.getElementsByClassName('slot');
    for (let i = 0; i < slots.length; i++) {
        slots[i].classList.remove("isWall");
        slots[i].classList.remove("slot-valid-hover");
    }

    // draw L
    document.getElementById('vs-3-0').classList.add("isWall");
    document.getElementById('ss-3-0').classList.add("isWall");
    document.getElementById('ss-4-0').classList.add("isWall");
    document.getElementById('vs-4-0').classList.add("isWall");
    document.getElementById('hs-4-1').classList.add("isWall");
    document.getElementById('ss-4-1').classList.add("isWall");

    // draw O
    document.getElementById('vs-3-2').classList.add("isWall");
    document.getElementById('ss-3-2').classList.add("isWall");
    document.getElementById('vs-4-2').classList.add("isWall");
    document.getElementById('hs-4-3').classList.add("isWall");
    document.getElementById('vs-4-3').classList.add("isWall");
    document.getElementById('ss-3-3').classList.add("isWall");
    document.getElementById('vs-3-3').classList.add("isWall");
    document.getElementById('hs-2-3').classList.add("isWall");

    // draw S
    document.getElementById('ss-2-5').classList.add("isWall");
    document.getElementById('hs-2-5').classList.add("isWall");
    document.getElementById('ss-2-4').classList.add("isWall");
    document.getElementById('vs-3-4').classList.add("isWall");
    document.getElementById('ss-3-4').classList.add("isWall");
    document.getElementById('hs-3-5').classList.add("isWall");
    document.getElementById('ss-3-5').classList.add("isWall");
    document.getElementById('vs-4-5').classList.add("isWall");
    document.getElementById('ss-4-5').classList.add("isWall");
    document.getElementById('hs-4-5').classList.add("isWall");
    document.getElementById('ss-4-4').classList.add("isWall");

    // draw E
    document.getElementById('ss-2-7').classList.add("isWall");
    document.getElementById('hs-2-7').classList.add("isWall");
    document.getElementById('ss-2-6').classList.add("isWall");
    document.getElementById('vs-3-6').classList.add("isWall");
    document.getElementById('ss-3-6').classList.add("isWall");
    document.getElementById('hs-3-7').classList.add("isWall");
    document.getElementById('vs-4-6').classList.add("isWall");
    document.getElementById('ss-4-6').classList.add("isWall");
    document.getElementById('hs-4-7').classList.add("isWall");
    document.getElementById('ss-4-7').classList.add("isWall");
    document.getElementById('ss-3-7').classList.add("isWall");
}

// this function is a timer
// it updates the time every second
function timer() {
    const timerId = (isMyTurn === true) ? 'my-timer' : 'opponent-timer';
    x = setInterval(function () {
        var minutes = Math.floor((time % (60 * 60)) / (60));
        var seconds = Math.floor((time % (60)) / 1);
        // padding with leading 0
        minutes = ("00" + minutes).substr(-2, 2);
        seconds = ("00" + seconds).substr(-2, 2);
        // If time is less than 10 seconds, turn timer to red
        if (time <= 10) {
            document.getElementById(timerId).classList.toggle('warning');
        }
        time--;
        // Output the time
        document.getElementById(timerId).innerHTML = minutes + ":" + seconds;


        
        // If the count down is over, write some text 
        if (time < 0) {
            clearInterval(x);
            document.getElementById(timerId).innerHTML = "Time";
            if(isMyTurn) {
                isMyTurn = false;
                displayLose();
            } else {
                displayWin();
            }
        }
    }, 1000);
}

// this function starts the timer
function startTimer() {
	time = 60;
    timer();
}

// this function stops and resets the timer
function stopTimer() {
    clearInterval(x);
    time = 60;
    const timerId = (isMyTurn === true) ? 'my-timer' : 'opponent-timer';
    document.getElementById(timerId).classList.remove('warning');
    var minutes = Math.floor((time % (60 * 60)) / (60));
    var seconds = Math.floor((time % (60)) / 1);
    // padding with leading 0
    minutes = ("00" + minutes).substr(-2, 2);
    seconds = ("00" + seconds).substr(-2, 2);
    // Output the time
    document.getElementById(timerId).innerHTML = minutes + ":" + seconds;
}