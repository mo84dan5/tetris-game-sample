const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('nextCanvas');
const nextCtx = nextCanvas.getContext('2d');

const ROWS = 20;
const COLS = 10;
let BLOCK_SIZE = 30;
let canvasWidth = 300;
let canvasHeight = 600;

let board = [];
let currentPiece = null;
let nextPiece = null;
let score = 0;
let level = 1;
let lines = 0;
let dropCounter = 0;
let lastTime = 0;
let dropInterval = 1000;
let gameRunning = false;
let gamePaused = false;

const COLORS = {
    0: '#000',
    1: '#0ff',
    2: '#00f',
    3: '#fa0',
    4: '#ff0',
    5: '#0f0',
    6: '#f0f',
    7: '#f00'
};

const PIECES = [
    [[1, 1, 1, 1]],
    [[1, 1], [1, 1]],
    [[0, 1, 0], [1, 1, 1]],
    [[1, 0, 0], [1, 1, 1]],
    [[0, 0, 1], [1, 1, 1]],
    [[0, 1, 1], [1, 1, 0]],
    [[1, 1, 0], [0, 1, 1]]
];

class Piece {
    constructor(type) {
        this.type = type + 1;
        this.shape = PIECES[type];
        this.x = Math.floor(COLS / 2) - Math.floor(this.shape[0].length / 2);
        this.y = 0;
    }

    rotate() {
        const rotated = [];
        for (let i = 0; i < this.shape[0].length; i++) {
            rotated[i] = [];
            for (let j = this.shape.length - 1; j >= 0; j--) {
                rotated[i].push(this.shape[j][i]);
            }
        }
        return rotated;
    }
}

function initBoard() {
    board = [];
    for (let r = 0; r < ROWS; r++) {
        board[r] = [];
        for (let c = 0; c < COLS; c++) {
            board[r][c] = 0;
        }
    }
}

function drawBlock(ctx, x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    ctx.strokeStyle = '#333';
    ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
}

function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (board[r][c]) {
                drawBlock(ctx, c, r, COLORS[board[r][c]]);
            }
        }
    }
}

function drawPiece(piece) {
    for (let r = 0; r < piece.shape.length; r++) {
        for (let c = 0; c < piece.shape[r].length; c++) {
            if (piece.shape[r][c]) {
                drawBlock(ctx, piece.x + c, piece.y + r, COLORS[piece.type]);
            }
        }
    }
}

function drawNextPiece() {
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    if (nextPiece) {
        const blockSize = window.innerWidth <= 768 ? 20 : 30;
        const offsetX = (4 - nextPiece.shape[0].length) / 2;
        const offsetY = (4 - nextPiece.shape.length) / 2;
        
        for (let r = 0; r < nextPiece.shape.length; r++) {
            for (let c = 0; c < nextPiece.shape[r].length; c++) {
                if (nextPiece.shape[r][c]) {
                    nextCtx.fillStyle = COLORS[nextPiece.type];
                    nextCtx.fillRect((offsetX + c) * blockSize, (offsetY + r) * blockSize, blockSize, blockSize);
                    nextCtx.strokeStyle = '#333';
                    nextCtx.strokeRect((offsetX + c) * blockSize, (offsetY + r) * blockSize, blockSize, blockSize);
                }
            }
        }
    }
}

function collision(piece, dx = 0, dy = 0, shape = piece.shape) {
    for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
            if (shape[r][c]) {
                const newX = piece.x + c + dx;
                const newY = piece.y + r + dy;
                
                if (newX < 0 || newX >= COLS || newY >= ROWS) {
                    return true;
                }
                
                if (newY >= 0 && board[newY][newX]) {
                    return true;
                }
            }
        }
    }
    return false;
}

function lockPiece() {
    for (let r = 0; r < currentPiece.shape.length; r++) {
        for (let c = 0; c < currentPiece.shape[r].length; c++) {
            if (currentPiece.shape[r][c]) {
                if (currentPiece.y + r < 0) {
                    gameOver();
                    return;
                }
                board[currentPiece.y + r][currentPiece.x + c] = currentPiece.type;
            }
        }
    }
    
    clearLines();
    currentPiece = nextPiece;
    nextPiece = new Piece(Math.floor(Math.random() * PIECES.length));
    
    if (collision(currentPiece)) {
        gameOver();
    }
}

function clearLines() {
    let linesCleared = 0;
    
    for (let r = ROWS - 1; r >= 0; r--) {
        if (board[r].every(cell => cell !== 0)) {
            board.splice(r, 1);
            board.unshift(new Array(COLS).fill(0));
            linesCleared++;
            r++;
        }
    }
    
    if (linesCleared > 0) {
        lines += linesCleared;
        score += linesCleared * 100 * level;
        level = Math.floor(lines / 10) + 1;
        dropInterval = Math.max(100, 1000 - (level - 1) * 100);
        updateScore();
    }
}

function updateScore() {
    document.getElementById('score').textContent = score;
    document.getElementById('level').textContent = level;
    document.getElementById('lines').textContent = lines;
}

function movePiece(dx, dy) {
    if (!collision(currentPiece, dx, dy)) {
        currentPiece.x += dx;
        currentPiece.y += dy;
        return true;
    }
    return false;
}

function rotatePiece() {
    const rotated = currentPiece.rotate();
    if (!collision(currentPiece, 0, 0, rotated)) {
        currentPiece.shape = rotated;
    }
}

function hardDrop() {
    while (movePiece(0, 1)) {
        score += 2;
    }
    lockPiece();
}

function gameOver() {
    gameRunning = false;
    alert(`ゲームオーバー！\nスコア: ${score}`);
    document.getElementById('startBtn').disabled = false;
    document.getElementById('pauseBtn').disabled = true;
}

function update(time = 0) {
    if (!gameRunning || gamePaused) return;
    
    const deltaTime = time - lastTime;
    lastTime = time;
    
    dropCounter += deltaTime;
    
    if (dropCounter > dropInterval) {
        if (!movePiece(0, 1)) {
            lockPiece();
        }
        dropCounter = 0;
    }
    
    drawBoard();
    drawPiece(currentPiece);
    drawNextPiece();
    
    requestAnimationFrame(update);
}

function startGame() {
    initBoard();
    score = 0;
    level = 1;
    lines = 0;
    dropInterval = 1000;
    updateScore();
    
    currentPiece = new Piece(Math.floor(Math.random() * PIECES.length));
    nextPiece = new Piece(Math.floor(Math.random() * PIECES.length));
    
    gameRunning = true;
    gamePaused = false;
    document.getElementById('startBtn').disabled = true;
    document.getElementById('pauseBtn').disabled = false;
    
    lastTime = 0;
    dropCounter = 0;
    update();
}

function pauseGame() {
    gamePaused = !gamePaused;
    document.getElementById('pauseBtn').textContent = gamePaused ? '再開' : '一時停止';
    if (!gamePaused) {
        lastTime = 0;
        update();
    }
}

function resetGame() {
    gameRunning = false;
    gamePaused = false;
    initBoard();
    score = 0;
    level = 1;
    lines = 0;
    updateScore();
    drawBoard();
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    document.getElementById('startBtn').disabled = false;
    document.getElementById('pauseBtn').disabled = true;
    document.getElementById('pauseBtn').textContent = '一時停止';
}

document.addEventListener('keydown', (e) => {
    if (!gameRunning || gamePaused) return;
    
    switch(e.key) {
        case 'ArrowLeft':
            movePiece(-1, 0);
            break;
        case 'ArrowRight':
            movePiece(1, 0);
            break;
        case 'ArrowDown':
            if (movePiece(0, 1)) {
                score += 1;
                updateScore();
            }
            break;
        case 'ArrowUp':
            rotatePiece();
            break;
        case ' ':
            hardDrop();
            break;
    }
});

document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('pauseBtn').addEventListener('click', pauseGame);
document.getElementById('resetBtn').addEventListener('click', resetGame);

function adjustCanvasSize() {
    if (window.innerWidth <= 768) {
        canvasWidth = 250;
        canvasHeight = 500;
        BLOCK_SIZE = 25;
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        
        const nextSize = 80;
        nextCanvas.width = nextSize;
        nextCanvas.height = nextSize;
    }
}

function setupTouchControls() {
    const touchLeft = document.getElementById('touchLeft');
    const touchRight = document.getElementById('touchRight');
    const touchDown = document.getElementById('touchDown');
    const touchRotate = document.getElementById('touchRotate');
    const touchDrop = document.getElementById('touchDrop');
    
    let touchInterval = null;
    
    const handleTouchStart = (action) => {
        if (!gameRunning || gamePaused) return;
        
        action();
        
        touchInterval = setInterval(() => {
            if (!gameRunning || gamePaused) {
                clearInterval(touchInterval);
                return;
            }
            action();
        }, 100);
    };
    
    const handleTouchEnd = () => {
        if (touchInterval) {
            clearInterval(touchInterval);
            touchInterval = null;
        }
    };
    
    touchLeft.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleTouchStart(() => movePiece(-1, 0));
    });
    
    touchRight.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleTouchStart(() => movePiece(1, 0));
    });
    
    touchDown.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleTouchStart(() => {
            if (movePiece(0, 1)) {
                score += 1;
                updateScore();
            }
        });
    });
    
    touchRotate.addEventListener('touchstart', (e) => {
        e.preventDefault();
        rotatePiece();
    });
    
    touchDrop.addEventListener('touchstart', (e) => {
        e.preventDefault();
        hardDrop();
    });
    
    [touchLeft, touchRight, touchDown].forEach(btn => {
        btn.addEventListener('touchend', handleTouchEnd);
        btn.addEventListener('touchcancel', handleTouchEnd);
    });
    
    touchLeft.addEventListener('click', () => movePiece(-1, 0));
    touchRight.addEventListener('click', () => movePiece(1, 0));
    touchDown.addEventListener('click', () => {
        if (movePiece(0, 1)) {
            score += 1;
            updateScore();
        }
    });
    touchRotate.addEventListener('click', () => rotatePiece());
    touchDrop.addEventListener('click', () => hardDrop());
}

adjustCanvasSize();
setupTouchControls();
initBoard();
drawBoard();

window.addEventListener('resize', () => {
    adjustCanvasSize();
    drawBoard();
    if (currentPiece) {
        drawPiece(currentPiece);
    }
});