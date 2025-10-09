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
            <span className="player-summary-name">
                {player.name}
                {player.secondChanceSuccesses.map((points, index) => (
                    <span key={index} className="badge-second-chance">
                        شانس مجدد: +{points}
                    </span>
                ))}
            </span>
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
    
    // State for the "Second Chance" feature
    const [showSecondChancePrompt, setShowSecondChancePrompt] = useState(false);
    const [awaitingSecondRoll, setAwaitingSecondRoll] = useState(false);
    const [secondChanceInfo, setSecondChanceInfo] = useState<{ initialScore: number; playerIndex: number; scoreBeforeTurn: number; } | null>(null);
    const [isFinalRound, setIsFinalRound] = useState(false); // "Final Round" now means "Second Chance is Active"
    const [roundStartPlayerIndex, setRoundStartPlayerIndex] = useState(0);


    useEffect(() => {
        const initialPlayers: Player[] = settings.playerNames.map((name, i) => ({
            name,
            score: 0,
            isCPU: i >= settings.numPlayers,
            history: [],
            secondChanceSuccesses: [],
        }));
        setPlayers(initialPlayers);
        setDiceValues(Array(settings.numDice).fill(1));
        const initialPlayerIndex = getRandomInt(0, initialPlayers.length - 1);
        setCurrentPlayerIndex(initialPlayerIndex);
        setRoundStartPlayerIndex(initialPlayerIndex);
    }, [settings]);

    // This effect now manages the activation of the "Second Chance" feature for both game modes.
    useEffect(() => {
        if (gameOver || players.length === 0) return;

        if (settings.winCondition === 'rounds') {
            // In rounds mode, active on the last round.
            if (currentRound === settings.winValue && !isFinalRound) {
                setIsFinalRound(true);
            }
        } else if (settings.winCondition === 'score') {
            // In score mode, active if any player is >= 80% of target, inactive if all are below.
            const shouldBeActive = players.some(p => p.score >= settings.winValue * 0.8);
            if (shouldBeActive !== isFinalRound) {
                setIsFinalRound(shouldBeActive);
            }
        }
    }, [players, currentRound, settings, gameOver, isFinalRound]);


    // Update game message based on current turn state
    useEffect(() => {
        if (gameOver || !players[currentPlayerIndex]) return;

        if (!awaitingSecondRoll && !showSecondChancePrompt) {
            if (isFinalRound) {
                setGameMessage(`دور آخر! نوبت ${players[currentPlayerIndex].name}`);
            } else {
                setGameMessage(`نوبت ${players[currentPlayerIndex].name}`);
            }
        }
    }, [currentPlayerIndex, players, gameOver, awaitingSecondRoll, showSecondChancePrompt, isFinalRound]);


    // Handle CPU turns
    useEffect(() => {
        if (gameOver || players.length === 0) return;
        const currentPlayer = players[currentPlayerIndex];

        // Scenario 1: CPU needs to decide on the second chance
        if (showSecondChancePrompt && currentPlayer.isCPU) {
            setTimeout(() => {
                const decision = Math.random() < 0.5; // 50% chance to accept
                handleSecondChanceDecision(decision);
            }, 2000);
            return; // Wait for decision, don't proceed to roll
        }

        // Scenario 2: CPU needs to perform a roll (either first or the re-roll after deciding)
        if (currentPlayer.isCPU && !isRolling && !showSecondChancePrompt) {
            setTimeout(() => {
                handleRollDice();
            }, 1500);
        }
    }, [currentPlayerIndex, players, gameOver, showSecondChancePrompt, isRolling, awaitingSecondRoll]);


    const endTurn = (updatedPlayers: Player[], lastPlayerIndex: number) => {
        let isGameOver = false;
        const nextIndex = (lastPlayerIndex + 1) % updatedPlayers.length;

        // Check if the game-ending condition is met.
        const winConditionMet = 
            (settings.winCondition === 'rounds' && isFinalRound) ||
            (settings.winCondition === 'score' && updatedPlayers.some(p => p.score >= settings.winValue));
            
        if (winConditionMet && nextIndex === roundStartPlayerIndex) {
            isGameOver = true;
        }

        if (isGameOver) {
            const maxScore = Math.max(...updatedPlayers.map(p => p.score));
            const potentialWinners = updatedPlayers.filter(p => p.score === maxScore);
            setWinners(potentialWinners);
            setGameOver(true);
            setPlayers(updatedPlayers);
        } else {
            if (nextIndex === roundStartPlayerIndex) {
                setCurrentRound(prev => prev + 1);
            }
            setPlayers(updatedPlayers);
            setCurrentPlayerIndex(nextIndex);
        }
        
        setIsRolling(false);
        setAwaitingSecondRoll(false);
        setSecondChanceInfo(null);
        setShowSecondChancePrompt(false);
    };
    
    const handleSecondChanceDecision = (accepted: boolean) => {
        setShowSecondChancePrompt(false);
        if (!secondChanceInfo) return;

        if (accepted) {
            setAwaitingSecondRoll(true);
            setGameMessage(`${players[currentPlayerIndex].name} شانس مجدد را انتخاب کرد!`);
        } else {
            // The score for the first roll has already been applied in handleRollDice.
            // We just need to end the current player's turn.
            endTurn(players, secondChanceInfo.playerIndex);
        }
    };

    const handleRollDice = () => {
        if (isRolling || gameOver || showSecondChancePrompt) return;

        setIsRolling(true);
        const newDiceValues = Array.from({ length: settings.numDice }, () => getRandomInt(1, 6));
        
        setTimeout(() => {
            const { baseScore, bonus, bonusMessage: newBonusMessage } = calculateScoreAndBonus(newDiceValues);
            const totalRoundScore = baseScore + bonus;
            
            setDiceValues(newDiceValues);
            
            if (newBonusMessage) {
                setBonusMessage(newBonusMessage);
                setTimeout(() => setBonusMessage(''), 2000);
            }

            if (awaitingSecondRoll && secondChanceInfo) {
                // Second roll (the gamble)
                const previousScore = secondChanceInfo.initialScore;
                let scoreChange = 0;
                let wonWithChance = false;

                if (totalRoundScore > previousScore) {
                    scoreChange = totalRoundScore * 2;
                    setGameMessage(`${players[currentPlayerIndex].name} با شانس مجدد ${scoreChange} امتیاز گرفت!`);
                    wonWithChance = true;
                } else {
                    scoreChange = -totalRoundScore * 2;
                    setGameMessage(`${players[currentPlayerIndex].name} با شانس مجدد ${Math.abs(scoreChange)} امتیاز از دست داد!`);
                }

                setTimeout(() => {
                    const updatedPlayers = players.map((player, index) => {
                        if (index === currentPlayerIndex) {
                            const newTotalScore = secondChanceInfo.scoreBeforeTurn + scoreChange;
                            
                            const newSuccesses = wonWithChance
                                ? [...player.secondChanceSuccesses, scoreChange]
                                : player.secondChanceSuccesses;
                            
                            return {
                                ...player,
                                score: Math.max(0, newTotalScore),
                                history: [...player.history, { score: baseScore, bonus }],
                                secondChanceSuccesses: newSuccesses,
                            };
                        }
                        return player;
                    });
                    endTurn(updatedPlayers, currentPlayerIndex);
                }, 1000);

            } else {
                // First roll
                const scoreBeforeThisTurn = players[currentPlayerIndex].score;
                const updatedPlayers = players.map((player, index) => {
                    if (index === currentPlayerIndex) {
                        return { ...player, score: player.score + totalRoundScore, history: [...player.history, { score: baseScore, bonus }] };
                    }
                    return player;
                });
                
                // Check if this player is the FIRST to reach the win score, triggering the final lap
                const isFirstToReachWinScore = settings.winCondition === 'score' &&
                    updatedPlayers[currentPlayerIndex].score >= settings.winValue &&
                    players.every(p => p.score < settings.winValue);

                if (isFirstToReachWinScore) {
                    setRoundStartPlayerIndex(currentPlayerIndex);
                }

                // Offer second chance if the mode is active (managed by the useEffect)
                if (isFinalRound) {
                    setGameMessage(`${players[currentPlayerIndex].name} امتیاز ${totalRoundScore} آورد!`);
                    setSecondChanceInfo({ initialScore: totalRoundScore, playerIndex: currentPlayerIndex, scoreBeforeTurn: scoreBeforeThisTurn });
                    setShowSecondChancePrompt(true);
                    setPlayers(updatedPlayers); 
                    setIsRolling(false); 
                } else {
                    setGameMessage(`${players[currentPlayerIndex].name} امتیاز ${totalRoundScore} آورد!`);
                    setTimeout(() => {
                        endTurn(updatedPlayers, currentPlayerIndex);
                    }, 1000);
                }
            }
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
                                {winners.sort((a,b) => b.score - a.score).map(p => <PlayerSummary key={p.name} player={p} />)}
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
                <div className="round-counter">
                    {settings.winCondition === 'rounds'
                        ? `دور ${currentRound} / ${settings.winValue}`
                        : `دور ${currentRound}`
                    }
                </div>
                <div className="dice-container">
                    {diceValues.map((val, i) => <Dice key={i} value={val} isRolling={isRolling} />)}
                </div>
                
                {showSecondChancePrompt && !currentPlayer.isCPU ? (
                    <div className="second-chance-prompt">
                        <p>امتیاز شما در این دور: {secondChanceInfo?.initialScore}. شانس مجدد میخواهید؟</p>
                         <p className="second-chance-rules">
                            برد: امتیاز × ۲ | باخت: امتیاز × ۲ (منفی)
                        </p>
                        <div className="btn-group">
                            <button className="btn" onClick={() => handleSecondChanceDecision(true)}>بله</button>
                            <button className="btn btn-secondary" onClick={() => handleSecondChanceDecision(false)}>خیر</button>
                        </div>
                    </div>
                ) : (
                    <button 
                        className="btn roll-btn" 
                        onClick={handleRollDice}
                        disabled={isRolling || currentPlayer?.isCPU || gameOver || showSecondChancePrompt}>
                        {awaitingSecondRoll ? 'پرتاب مجدد' : 'پرتاب تاس'}
                    </button>
                )}

                <div className="game-info">
                     {gameMessage}
                </div>
            </div>
        </div>
    );
};