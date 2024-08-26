import React, { useState, useEffect } from 'react';
import GameCell from './GameCell';
import useWebSocket from 'react-use-websocket';

const GameBoard = () => {
  const [gameState, setGameState] = useState(Array.from({ length: 5 }, () => Array(5).fill(null)));
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState('A');
  const [setupMode, setSetupMode] = useState(true);
  const [playerASetup, setPlayerASetup] = useState(['', '', '', '', '']);
  const [playerBSetup, setPlayerBSetup] = useState(['', '', '', '', '']);
  const [validMoves, setValidMoves] = useState([]);
  const [winner, setWinner] = useState(null);
  const [moveHistory, setMoveHistory] = useState({ A: [], B: [] }); // Move history state

  const { sendMessage, lastMessage } = useWebSocket('ws://localhost:8080');

  useEffect(() => {
    if (lastMessage !== null) {
      const data = JSON.parse(lastMessage.data);
      console.log('Received from server:', data);

      if (data.type === 'init') {
        setGameState(data.gameState.board);
        setCurrentPlayer(data.gameState.currentPlayer);
        setMoveHistory(data.gameState.moveHistory); // Set move history
        setSetupMode(true);
        setValidMoves([]);
        setWinner(null);
      }

      if (data.type === 'update') {
        setGameState(data.gameState.board);
        setCurrentPlayer(data.gameState.currentPlayer);
        setMoveHistory(data.gameState.moveHistory); // Update move history
        setSetupMode(false);
        setValidMoves([]);
        setWinner(null);
      }

      if (data.type === 'win') {
        setWinner(data.winner);
        setTimeout(() => {
          setGameState(Array.from({ length: 5 }, () => Array(5).fill(null)));
          setPlayerASetup(['', '', '', '', '']);
          setPlayerBSetup(['', '', '', '', '']);
          setMoveHistory({ A: [], B: [] }); // Reset move history
          setSetupMode(true);
          setWinner(null);
          setValidMoves([]);
        }, 2000);
      }
    }
  }, [lastMessage]);

  const handleSetup = (player, position, character) => {
    const setup = player === 'A' ? [...playerASetup] : [...playerBSetup];
    setup[position] = character;
    if (player === 'A') setPlayerASetup(setup);
    else setPlayerBSetup(setup);
  };

  const handleSetupSubmit = () => {
    sendMessage(JSON.stringify({ type: 'setup', playerA: playerASetup, playerB: playerBSetup }));
    setSetupMode(false);
  };

  const handleMove = (direction) => {
    if (selectedPiece) {
      sendMessage(
        JSON.stringify({
          type: 'move',
          row: selectedPiece.row,
          col: selectedPiece.col,
          move: direction,
        })
      );
      setSelectedPiece(null);
      setValidMoves([]);
    }
  };

  const handleCellClick = (row, col) => {
    const piece = gameState[row][col];
    if (piece && piece.startsWith(currentPlayer)) {
      setSelectedPiece({ piece, row, col });
      calculateValidMoves(row, col);
    }
  };

  const calculateValidMoves = (row, col) => {
    const moves = [];
    const piece = gameState[row][col];
  
    if (piece.startsWith('A-')) {
      // Player A moves
      if (row > 0) moves.push({ deltaRow: -1, deltaCol: 0 }); // Forward
      if (row < 4) moves.push({ deltaRow: 1, deltaCol: 0 });  // Backward
      if (col > 0) moves.push({ deltaRow: 0, deltaCol: -1 }); // Left
      if (col < 4) moves.push({ deltaRow: 0, deltaCol: 1 });  // Right
    } else if (piece.startsWith('B-')) {
      // Player B moves
      if (row < 4) moves.push({ deltaRow: 1, deltaCol: 0 });  // Forward
      if (row > 0) moves.push({ deltaRow: -1, deltaCol: 0 }); // Backward
      if (col < 4) moves.push({ deltaRow: 0, deltaCol: 1 });  // Right
      if (col > 0) moves.push({ deltaRow: 0, deltaCol: -1 }); // Left
    }
  
    setValidMoves(moves);
  };

  const handleNewGame = () => {
    setSetupMode(true);
    setPlayerASetup(['', '', '', '', '']);
    setPlayerBSetup(['', '', '', '', '']);
    setGameState(Array.from({ length: 5 }, () => Array(5).fill(null)));
    setMoveHistory({ A: [], B: [] }); // Reset move history
    sendMessage(JSON.stringify({ type: 'reset' }));
  };

  return (
    <div>
      {winner && <h2>Player {winner} Wins!</h2>}
      {setupMode ? (
        <div>
          <h2>Player A Setup</h2>
          {playerASetup.map((char, index) => (
            <select key={index} onChange={(e) => handleSetup('A', index, e.target.value)} value={char}>
              <option value="">Select Character</option>
              <option value="P1">Pawn</option>
              <option value="H1">Hero1</option>
              <option value="H2">Hero2</option>
            </select>
          ))}
          <h2>Player B Setup</h2>
          {playerBSetup.map((char, index) => (
            <select key={index} onChange={(e) => handleSetup('B', index, e.target.value)} value={char}>
              <option value="">Select Character</option>
              <option value="P1">Pawn</option>
              <option value="H1">Hero1</option>
              <option value="H2">Hero2</option>
            </select>
          ))}
          <button onClick={handleSetupSubmit}>Start Game</button>
        </div>
      ) : (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 60px)' }}>
            {gameState.map((row, rowIndex) =>
              row.map((cell, colIndex) => (
                <GameCell
                  key={`${rowIndex}-${colIndex}`}
                  cell={cell}
                  onClick={() => handleCellClick(rowIndex, colIndex)}
                  style={{
                    backgroundColor: selectedPiece && selectedPiece.row === rowIndex && selectedPiece.col === colIndex
                      ? 'lightgreen'
                      : 'white'
                  }}
                />
              ))
            )}
          </div>
          <div style={{ gridColumn: 'span 5', marginTop: '20px' }}>
            <p>Current Player: {currentPlayer}</p>
            <div>
              {validMoves.map((move, index) => (
                <button key={index} onClick={() => handleMove(move)}>
                  {move.deltaRow === 0 && move.deltaCol === 1 && 'Right'}
                  {move.deltaRow === 0 && move.deltaCol === -1 && 'Left'}
                  {move.deltaRow === 1 && move.deltaCol === 0 && 'Forward'}
                  {move.deltaRow === -1 && move.deltaCol === 0 && 'Backward'}
                  {move.deltaRow === 1 && move.deltaCol === 1 && 'Forward-Right'}
                  {move.deltaRow === -1 && move.deltaCol === -1 && 'Backward-Left'}
                  {move.deltaRow === 1 && move.deltaCol === -1 && 'Backward-Left'}
                  {move.deltaRow === -1 && move.deltaCol === 1 && 'Forward-Right'}
                </button>
              ))}
            </div>
            <button onClick={handleNewGame}>New Game</button>
            <div>
              <h3>Move History</h3>
              <table>
                <thead>
                  <tr>
                    <th>Player A Moves</th>
                    <th>Player B Moves</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: Math.max(moveHistory.A.length, moveHistory.B.length) }).map((_, index) => (
                    <tr key={index}>
                      <td>{moveHistory.A[index] || ''}</td>
                      <td>{moveHistory.B[index] || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameBoard;
