// Helper for more complex random number generation
export const getRandomInt = (min: number, max: number): number => {
  const randomBuffer = new Uint32Array(1);
  window.crypto.getRandomValues(randomBuffer);
  const randomNumber = randomBuffer[0] / (0xffffffff + 1);
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(randomNumber * (max - min + 1)) + min;
};

export const calculateScoreAndBonus = (diceValues: number[]) => {
    const numDice = diceValues.length;
    let baseScore = diceValues.reduce((a, b) => a + b, 0);
    let bonus = 0;
    const bonusMessages: string[] = [];

    // Handle single die case
    if (numDice === 1 && diceValues[0] === 6) {
        bonus = 1; // 6 gets a +1 bonus to become 7
        return { baseScore, bonus, bonusMessage: 'جایزه تاس ۶: ۱+ امتیاز!' };
    }
    
    if (numDice < 2) {
        return { baseScore, bonus, bonusMessage: '' };
    }

    const counts: { [key: number]: number } = diceValues.reduce((acc, val) => {
        acc[val] = (acc[val] || 0) + 1;
        return acc;
    }, {} as { [key: number]: number });

    // Handle bonuses for sixes
    if (counts[6]) {
        const sixBonus = counts[6];
        bonus += sixBonus;
        bonusMessages.push(`جایزه ${sixBonus} تاس شش: ${sixBonus}+`);
    }

    // Handle bonuses for all matches
    for (const numStr in counts) {
        if (numStr === '6') continue; // Sixes already handled for their special bonus

        const num = parseInt(numStr, 10);
        const count = counts[num];
        let matchBonus = 0;
        let matchMessage = '';

        if (count === 2) { matchBonus = num; matchMessage = `جفت ${num}: ${matchBonus}+`; }
        else if (count === 3) { matchBonus = num * 2; matchMessage = `سه تایی ${num}: ${matchBonus}+`; }
        else if (count === 4) { matchBonus = num * 3; matchMessage = `چهارتایی ${num}: ${matchBonus}+`; }
        else if (count === 5) { matchBonus = num * 4; matchMessage = `پنج تایی ${num}: ${matchBonus}+`; }
        
        if (matchBonus > 0) {
            bonus += matchBonus;
            bonusMessages.push(matchMessage);
        }
    }

    return { baseScore, bonus, bonusMessage: bonusMessages.join(' | ') };
};
