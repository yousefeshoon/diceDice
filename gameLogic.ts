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
    let baseScore = diceValues.reduce((a, b) => a + b, 0);
    let bonus = 0;
    const bonusMessages: string[] = [];
    
    if (diceValues.length < 1) {
        return { baseScore, bonus, bonusMessage: '' };
    }

    const counts: { [key: number]: number } = diceValues.reduce((acc, val) => {
        acc[val] = (acc[val] || 0) + 1;
        return acc;
    }, {} as { [key: number]: number });

    // New rule: Add 1 bonus point if exactly one 6 is rolled.
    // This rule does not apply if there are two or more 6s.
    if (counts[6] === 1) {
        bonus += 1;
        bonusMessages.push('تاس ۶: ۱+');
    }


    for (const numStr in counts) {
        const num = parseInt(numStr, 10);
        const count = counts[num];
        let matchBonus = 0;
        let matchMessage = '';

        if (count === 2) {
            matchBonus = num;
            matchMessage = `جفت ${num}: ${matchBonus}+`;
        } else if (count === 3) {
            matchBonus = num * 2;
            matchMessage = `سه تایی ${num}: ${matchBonus}+`;
        } else if (count === 4) {
            matchBonus = num * 3;
            matchMessage = `چهارتایی ${num}: ${matchBonus}+`;
        } else if (count === 5) {
            matchBonus = num * 4;
            matchMessage = `پنج تایی ${num}: ${matchBonus}+`;
        }
        
        if (matchBonus > 0) {
            bonus += matchBonus;
            bonusMessages.push(matchMessage);
        }
    }

    return { baseScore, bonus, bonusMessage: bonusMessages.join(' | ') };
};