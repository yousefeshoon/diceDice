import React, { useState } from 'react';
import type { GameSettings } from './types';

const DEFAULT_SETTINGS: Omit<GameSettings, 'playerNames'> & { playerNames: string[] } = {
  numPlayers: 1,
  playerNames: ['بازیکن ۱', 'بازیکن ۲', 'بازیکن ۳', 'بازیکن ۴'],
  numDice: 2,
  winCondition: 'rounds',
  winValue: 10,
};

interface SettingsScreenProps {
    onStartGame: (settings: GameSettings) => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onStartGame }) => {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'number' ? Number(value) : value;
    setSettings(prev => ({ ...prev, [name]: val as any }));
  };

  const handlePlayerNameChange = (index: number, name: string) => {
    const newPlayerNames = [...settings.playerNames];
    newPlayerNames[index] = name;
    setSettings(prev => ({ ...prev, playerNames: newPlayerNames }));
  };
  
  const setNumPlayers = (num: number) => {
    setSettings(prev => ({ ...prev, numPlayers: num }));
  };
  
  const setNumDice = (num: number) => {
    setSettings(prev => ({ ...prev, numDice: num }));
  };

  const handleShare = async () => {
    const shareData = {
      title: 'تاس بازی',
      text: 'بیا با هم تاس بازی کنیم!',
      url: window.location.href
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        alert('برای اشتراک‌گذاری، لینک صفحه را کپی کنید.');
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let finalPlayerNames = Array(4).fill(null);
    for (let i = 0; i < 4; i++) {
        if (i < settings.numPlayers) {
            finalPlayerNames[i] = settings.playerNames[i] || `بازیکن ${i + 1}`;
        } else {
            finalPlayerNames[i] = `پردازنده ${i + 1}`;
        }
    }
    onStartGame({ ...settings, playerNames: finalPlayerNames });
  };
  
  return (
    <div className="settings-container">
      <div className="settings-screen">
        <h1>تنظیمات بازی تاس</h1>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>تعداد بازیکنان</label>
            <div className="btn-group">
              {[1, 2, 3, 4].map(num => (
                <button type="button" key={num} className={`btn-choice ${settings.numPlayers === num ? 'active' : ''}`} onClick={() => setNumPlayers(num)}>
                  {num} نفره
                </button>
              ))}
            </div>
          </div>
          
          <div className="form-group">
            <label>نام بازیکنان</label>
            <div className="player-inputs">
              {Array.from({ length: 4 }).map((_, i) => (
                <input 
                  key={i}
                  className="input" 
                  type="text" 
                  value={i < settings.numPlayers ? settings.playerNames[i] : `پردازنده ${i + 1}`} 
                  onChange={(e) => handlePlayerNameChange(i, e.target.value)} 
                  placeholder={`نام بازیکن ${i + 1}`}
                  disabled={i >= settings.numPlayers}
                />
              ))}
            </div>
          </div>
          
          <div className="form-group">
            <label>تعداد تاس</label>
            <div className="btn-group">
                {[1, 2, 3, 4, 5].map(num => (
                    <button type="button" key={num} className={`btn-choice ${settings.numDice === num ? 'active' : ''}`} onClick={() => setNumDice(num)}>
                        {num}
                    </button>
                ))}
            </div>
          </div>
          
          <div className="form-group">
            <label>شرط برنده شدن</label>
             <div className="radio-group">
              <label>
                <input type="radio" name="winCondition" value="rounds" checked={settings.winCondition === 'rounds'} onChange={handleInputChange} />
                تعداد دور
              </label>
              <label>
                <input type="radio" name="winCondition" value="score" checked={settings.winCondition === 'score'} onChange={handleInputChange} />
                امتیاز هدف
              </label>
            </div>
            <input className="number-input" type="number" name="winValue" value={settings.winValue} onChange={handleInputChange} min="1" />
          </div>
          
          <button type="submit" className="btn">شروع بازی</button>
        </form>
      </div>
       <button className="btn btn-secondary" onClick={handleShare}>معرفی بازی به دیگران</button>
    </div>
  );
};
