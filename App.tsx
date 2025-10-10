import React, { useState } from 'react';
import { SettingsScreen } from './SettingsScreen';
import { GameBoardScreen } from './GameBoardScreen';
import type { GameSettings } from './types';

export const App = () => {
  const [gameSettings, setGameSettings] = useState<GameSettings | null>(null);

  const startGame = (settings: GameSettings) => {
    setGameSettings(settings);
  };

  const newGame = () => {
    setGameSettings(null);
  }

  return (
    <div className="app-container">
      {!gameSettings ? (
        <SettingsScreen onStartGame={startGame} />
      ) : (
        <GameBoardScreen settings={gameSettings} onNewGame={newGame}/>
      )}
    </div>
  );
};
