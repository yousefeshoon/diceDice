import React from 'react';

interface DiceProps {
    value: number;
    isRolling: boolean;
}

export const Dice: React.FC<DiceProps> = ({ value, isRolling }) => {
    const dotPositions: { [key: number]: number[][] } = {
        1: [[50, 50]],
        2: [[25, 25], [75, 75]],
        3: [[25, 25], [50, 50], [75, 75]],
        4: [[25, 25], [25, 75], [75, 25], [75, 75]],
        5: [[25, 25], [25, 75], [50, 50], [75, 25], [75, 75]],
        6: [[25, 25], [25, 75], [50, 25], [50, 75], [75, 25], [75, 75]]
    };

    return (
        <div className={`dice-face ${isRolling ? 'rolling' : ''}`} data-value={value}>
            {(dotPositions[value] || []).map(([top, left], i) => (
                <div key={i} className="dot" style={{ top: `${top}%`, left: `${left}%` }}></div>
            ))}
        </div>
    );
};
