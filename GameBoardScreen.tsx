import React, { useState, useEffect } from 'react';
import { Dice } from './Dice';
import { BonusToast } from './BonusToast';
import { getRandomInt, calculateScoreAndBonus } from './gameLogic';
import type { GameSettings, Player } from './types';

interface GameBoardScreenProps {
    settings: GameSettings;
    onNewGame: () => void;
}

const PlayerSummary = ({ player }: { player: Player }) => {
    const totalBonus = player.history.reduce((sum, h) => sum + h.bonus, 0);
    const mainScore = player.score - totalBonus;
    return (
        <div className="player-summary">
            <span className="player-summary-name">{player.name}</span>
            <span className="player-summary-score">
                {player.score} امتیاز
                <span className="score-detail"> (امتیاز: {mainScore} | جایزه: {totalBonus})</span>
            </span>
        </div>
    );
};

export const GameBoardScreen: React.FC<GameBoardScreenProps> = ({ settings, onNewGame }) => {
    const [players, setPlayers] = useState<Player[]>([]);
    const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
    const [diceValues, setDiceValues] = useState<number[]>([]);
    const [isRolling, setIsRolling] = useState(false);
    const [gameOver, setGameOver] = useState(false);
    const [winners, setWinners] = useState<Player[]>([]);
    const [currentRound, setCurrentRound] = useState(1);
    const [gameMessage, setGameMessage] = useState('');
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const [bonusMessage, setBonusMessage] = useState('');

    useEffect(() => {
        const initialPlayers: Player[] = settings.playerNames.map((name, i) => ({
            name,
            score: 0,
            isCPU: i >= settings.numPlayers,
            history: [],
        }));
        setPlayers(initialPlayers);
        setDiceValues(Array(settings.numDice).fill(1));
        setCurrentPlayerIndex(getRandomInt(0, initialPlayers.length - 1));
    }, [settings]);

    useEffect(() => {
        if (gameOver || !players[currentPlayerIndex]) return;
        setGameMessage(`نوبت ${players[currentPlayerIndex].name}`);
    }, [currentPlayerIndex, players, gameOver]);

    useEffect(() => {
        if (players.length === 0 || gameOver) return;

        const currentPlayer = players[currentPlayerIndex];
        if (currentPlayer.isCPU) {
            setTimeout(() => {
                handleRollDice();
            }, 1500);
        }
    }, [currentPlayerIndex, players, gameOver]);


    const handleRollDice = () => {
        if (isRolling || gameOver) return;

        setIsRolling(true);
        const newDiceValues = Array.from({ length: settings.numDice }, () => getRandomInt(1, 6));
        
        setTimeout(() => {
            const { baseScore, bonus, bonusMessage } = calculateScoreAndBonus(newDiceValues);
            const totalRoundScore = baseScore + bonus;
            
            setDiceValues(newDiceValues);
            setGameMessage(`${players[currentPlayerIndex].name} امتیاز ${totalRoundScore} آورد!`);
            
            if (bonusMessage) {
                setBonusMessage(bonusMessage);
                setTimeout(() => setBonusMessage(''), 2000);
            }
            
            setTimeout(() => {
                const updatedPlayers = players.map((player, index) => {
                    if (index === currentPlayerIndex) {
                        return {
                            ...player,
                            score: player.score + totalRoundScore,
                            history: [...player.history, { score: baseScore, bonus }],
                        };
                    }
                    return player;
                });

                const isLastPlayer = currentPlayerIndex === updatedPlayers.length - 1;
                let isGameOver = false;
                let potentialWinners: Player[] = [];

                if (isLastPlayer) { 
                    if (settings.winCondition === 'rounds' && currentRound >= settings.winValue) {
                        isGameOver = true;
                    } else if (settings.winCondition === 'score') {
                        const hasReachedTarget = updatedPlayers.some(p => p.score >= settings.winValue);
                        if (hasReachedTarget) {
                            isGameOver = true;
                        }
                    }

                    if (isGameOver) {
                        const maxScore = Math.max(...updatedPlayers.map(p => p.score));
                        if (maxScore > 0) {
                            potentialWinners = updatedPlayers.filter(p => p.score === maxScore);
                        }
                    }
                }
                
                setIsRolling(false);

                if (isGameOver) {
                    setWinners(potentialWinners);
                    setGameOver(true);
                    setPlayers(updatedPlayers);
                } else {
                    const nextIndex = (currentPlayerIndex + 1) % updatedPlayers.length;
                    if (nextIndex === 0) { 
                        setCurrentRound(prev => prev + 1);
                    }
                    setPlayers(updatedPlayers);
                    setCurrentPlayerIndex(nextIndex);
                }

            }, 1000);

        }, 700);
    };
    
    const handleExit = () => setShowExitConfirm(true);
    const confirmExit = () => onNewGame();
    const cancelExit = () => setShowExitConfirm(false);

    if (players.length === 0) return <div>در حال بارگذاری...</div>;

    const currentPlayer = players[currentPlayerIndex];
    const losers = players.filter(p => !winners.find(w => w.name === p.name));


    return (
        <div className="game-board">
            <BonusToast message={bonusMessage} />
            {showExitConfirm && (
                <div className="confirm-overlay">
                    <div className="confirm-dialog">
                        <p>آیا مطمئن هستید که می‌خواهید از بازی خارج شوید؟</p>
                        <div className="btn-group">
                            <button className="btn" onClick={confirmExit}>بله</button>
                            <button className="btn btn-secondary" onClick={cancelExit}>خیر</button>
                        </div>
                    </div>
                </div>
            )}
            {gameOver && (
                <div className="game-over-overlay">
                    <div className="game-over-card">
                        <h2>بازی تمام شد!</h2>
                        <div className="winner-announcement">
                            {winners.length > 1 && `تساوی بین ${winners.map(w => w.name).join(' و ')}!`}
                            {winners.length === 1 && `${winners[0].name} برنده شد!`}
                            {winners.length === 0 && 'نتیجه بازی تساوی شد!'}
                        </div>

                        {winners.length > 0 && (
                             <div className="results-section">
                                <h4>🏆 برنده(ها)</h4>
                                {winners.map(p => <PlayerSummary key={p.name} player={p} />)}
                            </div>
                        )}
                       
                        {losers.length > 0 && (
                            <div className="results-section">
                                <h4>سایر بازیکنان</h4>
                                 {losers
                                    .sort((a, b) => b.score - a.score)
                                    .map(p => <PlayerSummary key={p.name} player={p} />)}
                            </div>
                        )}
                        
                        <button className="btn" onClick={onNewGame}>بازی جدید</button>
                    </div>
                </div>
            )}
            {players.map((player, index) => (
                 <div key={index} className={`player-area player-${index + 1} ${currentPlayerIndex === index ? 'active' : ''}`}>
                    <div className="player-header">
                        <div className="player-name">{player.name}</div>
                        <div className="player-score">{player.score}</div>
                    </div>
                    <div className="scores-box">
                         <div className="round-scores-container">
                            {player.history.map((h, i) => (
                                <React.Fragment key={i}>
                                    <div className="round-score-chip">{h.score}</div>
                                    {h.bonus > 0 && <div className="round-score-chip bonus">{`+${h.bonus}`}</div>}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                </div>
            ))}
            <div className="center-area">
                <button className="btn btn-exit" onClick={handleExit}>خروج</button>
                <div className="dice-container">
                    {diceValues.map((val, i) => <Dice key={i} value={val} isRolling={isRolling} />)}
                </div>
                <button 
                    className="btn roll-btn" 
                    onClick={handleRollDice}
                    disabled={isRolling || currentPlayer?.isCPU || gameOver}>
                    پرتاب تاس
                </button>
                <div className="game-info">
                    {settings.winCondition === 'rounds' ? `دور ${currentRound} از ${settings.winValue}`: gameMessage}
                </div>
            </div>
        </div>
    );
};