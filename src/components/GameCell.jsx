import React from 'react';

const GameCell = ({ cell, onClick }) => {
  return (
    <div
      className={`cell ${cell ? 'occupied' : ''}`}
      onClick={onClick}
      style={{
        width: '60px',
        height: '60px',
        border: '1px solid #000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
      }}
    >
      {cell}
    </div>
  );
};

export default GameCell;
