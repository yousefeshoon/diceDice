import React, { useState, useEffect } from 'react';
import { Dice } from './Dice';
import { BonusToast } from './BonusToast';
import { ScoreChart } from './ScoreChart';
import { getRandomInt, calculateScoreAndBonus } from './gameLogic';
import type { GameSettings, Player } from './types';

interface GameBoardScreenProps {
    settings: GameSettings;
    onNewGame: () => void;
}

// Fix: Correctly type PlayerSummary props using an interface and React.FC to allow for the 'key' prop in lists.
interface PlayerSummaryProps {
    player: Player;
    onShowChart: () => void;
}

const PlayerSummary: React.FC<PlayerSummaryProps> = ({ player, onShowChart }) => {
    const totalBonus = player.history.reduce((sum, h) => sum + h.bonus, 0);
    const mainScore = player.score - totalBonus;
    return (
        <div className="player-summary">
            <div className="player-summary-details">
                <span className="player-summary-name">
                    {player.name}
                    <button className="btn-chart" onClick={onShowChart} title={`نمودار امتیاز ${player.name}`}>📊</button>
                </span>
                 <div className="badges-container">
                    {player.secondChanceHistory.map((points, index) => (
                        <span key={index} className={`badge ${points >= 0 ? 'positive' : 'negative'}`}>
                            شانس مجدد: {points >= 0 ? '+' : ''}{points}
                        </span>
                    ))}
                </div>
            </div>
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
    const [isAutomaticSecondChanceActive, setIsAutomaticSecondChanceActive] = useState(false); // Renamed from isFinalRound
    const [roundStartPlayerIndex, setRoundStartPlayerIndex] = useState(0);
    const [chartPlayerIndex, setChartPlayerIndex] = useState<number | null>(null);

    // New state for player-initiated second chance
    const [playerInitiatedSecondChanceActive, setPlayerInitiatedSecondChanceActive] = useState(false);
    const [showVotePrompt, setShowVotePrompt] = useState(false);
    const [voteInfo, setVoteInfo] = useState<{
        requesterIndex: number;
        votes: { [voterIndex: number]: 'yes' | 'no' };
    } | null>(null);
    const [secondChanceEndIndex, setSecondChanceEndIndex] = useState<number | null>(null);

    useEffect(() => {
        const initialPlayers: Player[] = settings.playerNames.map((name, i) => ({
            name,
            score: 0,
            isCPU: i >= settings.numPlayers,
            history: [],
            secondChanceHistory: [],
            scoreHistory: [0],
            lastVoteInitiatedRound: 0,
        }));
        setPlayers(initialPlayers);
        setDiceValues(Array(settings.numDice).fill(1));
        const initialPlayerIndex = getRandomInt(0, initialPlayers.length - 1);
        setCurrentPlayerIndex(initialPlayerIndex);
        setRoundStartPlayerIndex(initialPlayerIndex);
    }, [settings]);

    // This effect manages the activation of the automatic "Second Chance" feature.
    useEffect(() => {
        if (gameOver || players.length === 0) return;

        if (settings.winCondition === 'rounds') {
            if (currentRound === settings.winValue && !isAutomaticSecondChanceActive) {
                setIsAutomaticSecondChanceActive(true);
            }
        } else if (settings.winCondition === 'score') {
            const shouldBeActive = players.some(p => p.score >= settings.winValue * 0.8);
            if (shouldBeActive !== isAutomaticSecondChanceActive) {
                setIsAutomaticSecondChanceActive(shouldBeActive);
            }
        }
    }, [players, currentRound, settings, gameOver, isAutomaticSecondChanceActive]);


    // Update game message based on current turn state
    useEffect(() => {
        if (gameOver || !players[currentPlayerIndex] || showVotePrompt) return;

        if (!awaitingSecondRoll && !showSecondChancePrompt) {
            if (isAutomaticSecondChanceActive) {
                setGameMessage(`دور آخر! نوبت ${players[currentPlayerIndex].name}`);
            } else {
                setGameMessage(`نوبت ${players[currentPlayerIndex].name}`);
            }
        }
    }, [currentPlayerIndex, players, gameOver, awaitingSecondRoll, showSecondChancePrompt, isAutomaticSecondChanceActive, showVotePrompt]);


    // Handle CPU turns
    useEffect(() => {
        if (gameOver || players.length === 0 || showVotePrompt) return;
        const currentPlayer = players[currentPlayerIndex];
        if (!currentPlayer?.isCPU) return;

        const handleCpuTurn = () => {
             // Scenario 1: CPU needs to decide on the second chance
            if (showSecondChancePrompt) {
                const decision = Math.random() < 0.5; // 50% chance to accept
                handleSecondChanceDecision(decision);
                return; // Wait for decision, don't proceed to roll
            }
            // Scenario 2: CPU maybe wants to request a vote
            const isSecondChanceActiveForRound = isAutomaticSecondChanceActive || playerInitiatedSecondChanceActive;
            const canRequest = (currentPlayer.lastVoteInitiatedRound === 0 || currentRound - currentPlayer.lastVoteInitiatedRound >= 9) && !isSecondChanceActiveForRound && !showVotePrompt;
            const isLosing = currentPlayer.score < Math.max(...players.map(p => p.score));
            if (canRequest && isLosing && Math.random() < 0.15) {
                handleRequestSecondChance(currentPlayerIndex);
                return;
            }

            // Scenario 3: CPU needs to perform a roll (either first or the re-roll after deciding)
            if (!isRolling && !showSecondChancePrompt) {
                handleRollDice();
            }
        }
        setTimeout(handleCpuTurn, 1500);
    }, [currentPlayerIndex, players, gameOver, showSecondChancePrompt, isRolling, awaitingSecondRoll, showVotePrompt]);
    
    // Effect to process vote results and trigger CPU votes
    useEffect(() => {
        if (!voteInfo) return;

        const processVotes = () => {
            const yesVotes = Object.values(voteInfo.votes).filter(v => v === 'yes').length;
            const noVotes = Object.values(voteInfo.votes).filter(v => v === 'no').length;

            if (yesVotes >= 3) {
                setGameMessage('درخواست شانس مجدد پذیرفته شد!');
                setPlayerInitiatedSecondChanceActive(true);
                setSecondChanceEndIndex(voteInfo.requesterIndex);
                setShowVotePrompt(false);
                setVoteInfo(null);
            } else if (noVotes >= 2) {
                setGameMessage('درخواست شانس مجدد رد شد.');
                setShowVotePrompt(false);
                setVoteInfo(null);
            }
        }

        const handleCpuVote = (cpuIndex: number) => {
             setTimeout(() => {
                const decision = Math.random() < 0.6 ? 'yes' : 'no'; // CPUs are slightly agreeable
                handleCastVote(cpuIndex, decision);
            }, 1000 + Math.random() * 1500);
        }

        // Trigger votes for any CPUs that haven't voted yet
        players.forEach((player, index) => {
            if (player.isCPU && !voteInfo.votes[index]) {
                handleCpuVote(index);
            }
        });

        processVotes();

    }, [voteInfo, players]);


    const endTurn = (playersFromLastAction: Player[], lastPlayerIndex: number) => {
        const playersWithUpdatedHistory = playersFromLastAction.map((p, index) => {
            if (index === lastPlayerIndex) {
                const history = p.scoreHistory?.length ? p.scoreHistory : [0];
                return {
                    ...p,
                    scoreHistory: [...history, p.score]
                };
            }
            return p;
        });

        let isGameOver = false;
        const nextIndex = (lastPlayerIndex + 1) % playersWithUpdatedHistory.length;
        
        // Deactivate player-initiated second chance if a full circle has been completed.
        if (playerInitiatedSecondChanceActive && nextIndex === secondChanceEndIndex) {
            setPlayerInitiatedSecondChanceActive(false);
            setSecondChanceEndIndex(null);
        }

        if (nextIndex === roundStartPlayerIndex) {
            // Check if game ends after this full round
             const winConditionMet = 
                (settings.winCondition === 'rounds' && isAutomaticSecondChanceActive) ||
                (settings.winCondition === 'score' && playersWithUpdatedHistory.some(p => p.score >= settings.winValue));
            if (winConditionMet) {
                isGameOver = true;
            } else {
                // Start of a new regular round
                setCurrentRound(prev => prev + 1);
            }
        }


        if (isGameOver) {
            const maxScore = Math.max(...playersWithUpdatedHistory.map(p => p.score));
            const potentialWinners = playersWithUpdatedHistory.filter(p => p.score === maxScore);
            setWinners(potentialWinners);
            setGameOver(true);
            setPlayers(playersWithUpdatedHistory);
        } else {
            setPlayers(playersWithUpdatedHistory);
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
            endTurn(players, secondChanceInfo.playerIndex);
        }
    };

    const handleRollDice = () => {
        if (isRolling || gameOver || showSecondChancePrompt || showVotePrompt) return;

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

                if (totalRoundScore > previousScore) {
                    scoreChange = totalRoundScore * 2;
                    setGameMessage(`${players[currentPlayerIndex].name} با شانس مجدد ${scoreChange} امتیاز گرفت!`);
                } else {
                    scoreChange = -totalRoundScore * 2;
                    setGameMessage(`${players[currentPlayerIndex].name} با شانس مجدد ${Math.abs(scoreChange)} امتیاز از دست داد!`);
                }

                setTimeout(() => {
                    const updatedPlayers = players.map((player, index) => {
                        if (index === currentPlayerIndex) {
                            const newTotalScore = secondChanceInfo.scoreBeforeTurn + scoreChange;
                            const newSecondChanceHistory = [...player.secondChanceHistory, scoreChange];
                            
                            return {
                                ...player,
                                score: newTotalScore,
                                history: [...player.history, { score: baseScore, bonus }],
                                secondChanceHistory: newSecondChanceHistory,
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
                
                const isFirstToReachWinScore = settings.winCondition === 'score' &&
                    updatedPlayers[currentPlayerIndex].score >= settings.winValue &&
                    players.every(p => p.score < settings.winValue);

                if (isFirstToReachWinScore) {
                    setRoundStartPlayerIndex(currentPlayerIndex);
                }

                const offerSecondChance = isAutomaticSecondChanceActive || playerInitiatedSecondChanceActive;

                if (offerSecondChance) {
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

    const handleRequestSecondChance = (requesterIndex: number) => {
        if (isRolling || gameOver || showVotePrompt) return;
        setPlayers(prev => prev.map((p, i) => i === requesterIndex ? { ...p, lastVoteInitiatedRound: currentRound } : p));
        setVoteInfo({
            requesterIndex,
            votes: { [requesterIndex]: 'yes' }
        });
        setShowVotePrompt(true);
        setGameMessage(`${players[requesterIndex].name} درخواست شانس مجدد داد.`);
    };

    const handleCastVote = (voterIndex: number, vote: 'yes' | 'no') => {
        setVoteInfo(prev => {
            if (!prev || prev.votes[voterIndex]) return prev; // Already voted
            const newVotes = { ...prev.votes, [voterIndex]: vote };
            return { ...prev, votes: newVotes };
        });
    };
    
    const handleExit = () => setShowExitConfirm(true);
    const confirmExit = () => onNewGame();
    const cancelExit = () => setShowExitConfirm(false);

    if (players.length === 0) return <div>در حال بارگذاری...</div>;

    const currentPlayer = players[currentPlayerIndex];
    const losers = players.filter(p => !winners.find(w => w.name === p.name));
    const isSecondChanceActiveForRound = isAutomaticSecondChanceActive || playerInitiatedSecondChanceActive;

    return (
        <div className="game-board">
            <BonusToast message={bonusMessage} />
            {chartPlayerIndex !== null && players[chartPlayerIndex] && (
                <ScoreChart 
                player={players[chartPlayerIndex]} 
                onClose={() => setChartPlayerIndex(null)} 
                />
            )}
            {showVotePrompt && voteInfo && (
                <div className="vote-overlay">
                    <div className="vote-prompt">
                        <h3>درخواست شانس مجدد</h3>
                        <p>{players[voteInfo.requesterIndex].name} درخواست فعال‌سازی شانس مجدد برای این دور را دارد.</p>
                        <div className="player-vote-list">
                            {players.map((p, i) => (
                                <div key={i} className="player-vote-item">
                                    <span>{p.name}</span>
                                    {voteInfo.votes[i] ? (
                                        <span className={`vote-status ${voteInfo.votes[i]}`}>{voteInfo.votes[i] === 'yes' ? 'بله' : 'خیر'}</span>
                                    ) : (
                                        !p.isCPU && i !== voteInfo.requesterIndex ? (
                                            <div className="vote-actions">
                                                <button className="btn-vote yes" onClick={() => handleCastVote(i, 'yes')}>بله</button>
                                                <button className="btn-vote no" onClick={() => handleCastVote(i, 'no')}>خیر</button>
                                            </div>
                                        ) : (
                                            <span className="vote-status pending">در حال تصمیم...</span>
                                        )
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
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
                                {winners.sort((a,b) => b.score - a.score).map(p => {
                                    const playerIndex = players.findIndex(pl => pl.name === p.name);
                                    return <PlayerSummary key={p.name} player={p} onShowChart={() => setChartPlayerIndex(playerIndex)} />
                                })}
                            </div>
                        )}
                       
                        {losers.length > 0 && (
                            <div className="results-section">
                                <h4>سایر بازیکنان</h4>
                                 {losers
                                    .sort((a, b) => b.score - a.score)
                                    .map(p => {
                                        const playerIndex = players.findIndex(pl => pl.name === p.name);
                                        return <PlayerSummary key={p.name} player={p} onShowChart={() => setChartPlayerIndex(playerIndex)} />
                                    })}
                            </div>
                        )}
                        
                        <button className="btn" onClick={onNewGame}>بازی جدید</button>
                    </div>
                </div>
            )}
            {players.map((player, index) => {
                 const isMyTurn = currentPlayerIndex === index;
                 const isOnCooldown = player.lastVoteInitiatedRound !== 0 && currentRound - player.lastVoteInitiatedRound < 9;
                 const canRequestVote = isMyTurn && !isOnCooldown && !isSecondChanceActiveForRound && !showVotePrompt && !gameOver;
                 
                 let requestButtonTitle = '';
                 if (!isMyTurn) {
                     requestButtonTitle = 'در نوبت شما فعال می‌شود';
                 } else if (isOnCooldown) {
                     const roundsLeft = 9 - (currentRound - player.lastVoteInitiatedRound);
                     requestButtonTitle = `شانس مجدد تا ${roundsLeft} دور دیگر در دسترس نیست`;
                 } else if (isSecondChanceActiveForRound) {
                     requestButtonTitle = 'شانس مجدد در این دور فعال است';
                 } else if (showVotePrompt) {
                     requestButtonTitle = 'رای‌گیری در جریان است';
                 } else {
                     requestButtonTitle = 'درخواست شانس مجدد';
                 }

                 return (
                    <div key={index} className={`player-area player-${index + 1} ${currentPlayerIndex === index ? 'active' : ''}`}>
                        <div className="player-header">
                            <div className="player-name-container">
                                <div className="player-name">{player.name}</div>
                                <button className="btn-chart" onClick={() => setChartPlayerIndex(index)} title={`نمودار امتیاز ${player.name}`}>📊</button>
                                {!player.isCPU && (
                                     <button 
                                        className="btn-request-chance" 
                                        onClick={() => handleRequestSecondChance(index)} 
                                        disabled={!canRequestVote}
                                        title={requestButtonTitle}
                                    >
                                        ✨
                                    </button>
                                )}
                            </div>
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
                );
            })}
            <div className="center-area">
                <button className="btn btn-exit" onClick={handleExit}>خروج</button>
                <div className="round-counter">
                    {settings.winCondition === 'rounds'
                        ? `دور ${currentRound} / ${settings.winValue}`
                        : `دور ${currentRound}`
                    }
                </div>
                <div className={`second-chance-status ${isSecondChanceActiveForRound ? 'active' : ''}`}>
                   شانس مجدد {isSecondChanceActiveForRound ? 'فعال' : 'غیرفعال'}
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
                        disabled={isRolling || currentPlayer?.isCPU || gameOver || showSecondChancePrompt || showVotePrompt}>
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