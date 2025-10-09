export interface GameSettings {
  numPlayers: number;
  playerNames: string[];
  numDice: number;
  winCondition: 'rounds' | 'score';
  winValue: number;
}

export interface PlayerHistory {
    score: number;
    bonus: number;
}

export interface Player {
    name: string;
    score: number;
    isCPU: boolean;
    history: PlayerHistory[];
    secondChanceHistory: number[];
    scoreHistory: number[];
}