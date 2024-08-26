const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

let gameState = {
  board: Array.from({ length: 5 }, () => Array(5).fill(null)),
  currentPlayer: 'A',
  playerA: 5,
  playerB: 5
};

let moveHistory = {
  A: [],
  B: []
};
let invalidMoves = [];
let capturedPieces = [];

function broadcastGameState() {
  const data = JSON.stringify({
    type: 'update',
    gameState,
    moveHistory,
    invalidMoves,
    capturedPieces
  });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

function checkWinCondition() {
  const playerACharacters = gameState.board.flat().filter(cell => cell && cell.startsWith('A-')).length;
  const playerBCharacters = gameState.board.flat().filter(cell => cell && cell.startsWith('B-')).length;

  if (playerACharacters === 0) {
    broadcastGameState({ type: 'win', winner: 'B' });
  } else if (playerBCharacters === 0) {
    broadcastGameState({ type: 'win', winner: 'A' });
  }
}

wss.on('connection', (ws) => {
  console.log('A new player connected.');
  ws.send(JSON.stringify({ type: 'init', gameState, moveHistory, invalidMoves, capturedPieces }));

  ws.on('message', (message) => {
    const data = JSON.parse(message);

    if (data.type === 'setup') {
      gameState.board[0] = data.playerA.map((char, i) => `A-${char}`);
      gameState.board[4] = data.playerB.map((char, i) => `B-${char}`);
      broadcastGameState();
    }

    if (data.type === 'move') {
      const { row, col, move } = data;
      const piece = gameState.board[row][col];

      if (piece) {
        const newRow = row + move.deltaRow;
        const newCol = col + move.deltaCol;

        if (newRow >= 0 && newRow < 5 && newCol >= 0 && newCol < 5) {
          const targetPiece = gameState.board[newRow][newCol];
          if (!targetPiece || !targetPiece.startsWith(gameState.currentPlayer)) {
            if (piece.startsWith('H')) {
              // Hero movement
              let tempRow = row;
              let tempCol = col;
              while (tempRow !== newRow || tempCol !== newCol) {
                const currentPiece = gameState.board[tempRow][tempCol];
                if (currentPiece && !currentPiece.startsWith(gameState.currentPlayer)) {
                  capturedPieces.push(currentPiece);
                  gameState.board[tempRow][tempCol] = null;
                }
                tempRow += move.deltaRow;
                tempCol += move.deltaCol;
                if (tempRow === newRow && tempCol === newCol) {
                  gameState.board[tempRow][tempCol] = piece;
                }
              }
            } else {
              // Regular piece movement
              const targetPiece = gameState.board[newRow][newCol];
              if (targetPiece && !targetPiece.startsWith(gameState.currentPlayer)) {
                capturedPieces.push(targetPiece);
              }
              gameState.board[row][col] = null;
              gameState.board[newRow][newCol] = piece;
            }

            moveHistory[gameState.currentPlayer].push({ from: [row, col], to: [newRow, newCol] });
            gameState.currentPlayer = gameState.currentPlayer === 'A' ? 'B' : 'A';
            checkWinCondition();
            broadcastGameState();
          } else {
            invalidMoves.push({ player: gameState.currentPlayer, move: { from: [row, col], to: [newRow, newCol] } });
            ws.send(JSON.stringify({ type: 'invalid', message: 'Move targets friendly piece' }));
          }
        } else {
          invalidMoves.push({ player: gameState.currentPlayer, move: { from: [row, col], to: [newRow, newCol] } });
          ws.send(JSON.stringify({ type: 'invalid', message: 'Move out of bounds' }));
        }
      } else {
        invalidMoves.push({ player: gameState.currentPlayer, move: { from: [row, col], to: [newRow, newCol] } });
        ws.send(JSON.stringify({ type: 'invalid', message: 'Invalid piece' }));
      }
    }

    if (data.type === 'reset') {
      gameState = {
        board: Array.from({ length: 5 }, () => Array(5).fill(null)),
        currentPlayer: 'A',
        playerA: 5,
        playerB: 5
      };
      moveHistory = { A: [], B: [] };
      invalidMoves = [];
      capturedPieces = [];
      broadcastGameState();
    }
  });

  ws.on('close', () => {
    console.log('A player disconnected.');
  });
});

console.log('WebSocket server is running on ws://localhost:8080');
