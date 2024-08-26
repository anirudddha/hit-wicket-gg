import React from 'react';
import GameBoard from './components/GameBoard';

function App() {
  return (
    <div className="App" style={{ display: 'flex', justifyContent: 'center', marginTop: '50px' }}>
      <GameBoard />
    </div>
  );
}

export default App;