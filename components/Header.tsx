import React from 'react';

interface HeaderProps {
  onCatClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onCatClick }) => {
  return (
    <header className="bg-gradient-to-r from-primary to-accent shadow-lg">
      <div className="container mx-auto px-4 py-4 flex items-center gap-4">
        <span 
          className="text-4xl cursor-pointer transition-transform transform hover:scale-110 hover:rotate-[-12deg]" 
          role="button" 
          aria-label="Easter Egg Trigger" 
          onClick={onCatClick}
          title="Psst!"
        >
          🐱
        </span>
        <span className="text-4xl" role="img" aria-label="Microphone">🎤</span>
        <h1 className="text-3xl font-extrabold text-white tracking-wide">
          MemoMeow
        </h1>
      </div>
    </header>
  );
};