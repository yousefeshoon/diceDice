import React from 'react';

interface BonusToastProps {
    message: string;
}

export const BonusToast: React.FC<BonusToastProps> = ({ message }) => {
    if (!message) return null;
    return <div className="bonus-toast">{message}</div>;
};
