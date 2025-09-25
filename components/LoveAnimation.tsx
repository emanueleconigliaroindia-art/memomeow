import React, { useEffect, useMemo } from 'react';

interface LoveAnimationProps {
    onAnimationEnd: () => void;
}

const EMOJIS = ['❤️', '🌸', '💖', '🌺', '💕', '🌷', '🥰'];
const NUM_EMOJIS = 50;

export const LoveAnimation: React.FC<LoveAnimationProps> = ({ onAnimationEnd }) => {

    useEffect(() => {
        const timer = setTimeout(() => {
            onAnimationEnd();
        }, 6000); // Animation lasts for 6 seconds, including fade out time

        return () => clearTimeout(timer);
    }, [onAnimationEnd]);

    const fallingEmojis = useMemo(() => {
        return Array.from({ length: NUM_EMOJIS }).map((_, i) => {
            const style = {
                left: `${Math.random() * 100}vw`,
                animationDuration: `${Math.random() * 3 + 4}s`, // 4s to 7s
                animationDelay: `${Math.random() * 2}s`,
                fontSize: `${Math.random() * 1.5 + 1}rem` // 1rem to 2.5rem
            };
            const emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
            return <div key={i} className="falling-emoji" style={style}>{emoji}</div>;
        });
    }, []);

    return (
        <div className="modal-backdrop">
            <div className="love-animation-overlay">
                {fallingEmojis}
            </div>
            <div className="relative z-[1001]">
                <h1 className="love-text">Ti Amo</h1>
            </div>
        </div>
    );
};
