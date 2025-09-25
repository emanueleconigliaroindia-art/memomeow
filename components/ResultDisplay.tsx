import React, { useState } from 'react';
import { Spinner } from './Spinner';

interface ResultDisplayProps {
  title: string;
  text: string;
  isStreaming?: boolean;
  isLoading?: boolean;
  icon?: string;
  onGenerateLesson?: () => void;
  isGeneratingLesson?: boolean;
  onFullscreen?: () => void;
}

export const ResultDisplay: React.FC<ResultDisplayProps> = ({ 
  title, 
  text, 
  isStreaming = false, 
  isLoading = false, 
  icon,
  onGenerateLesson,
  isGeneratingLesson,
  onFullscreen
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const fileName = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-gray-400">
          <Spinner />
          <p className="mt-2 font-medium">MemoMeow sta pensando... 🤔</p>
        </div>
      );
    }
    if (text) {
      return text.split('\n').map((line, index) => {
        const match = line.match(/^(\[\d{2}:\d{2}:\d{2}\])/);
        if (match) {
          const timestamp = match[1];
          const content = line.substring(timestamp.length).trim();
          return (
            <p key={index} className="mb-2">
              <strong className="text-primary-dark mr-2 font-mono">{timestamp}</strong>
              <span>{content}</span>
            </p>
          );
        }
        return <p key={index}>{line || '\u00A0'}</p>;
      });
    }
    return <p className="text-gray-400 font-medium">Nessun contenuto da mostrare. 😿</p>;
  };

  return (
    <div className="bg-white p-6 rounded-3xl shadow-lg shadow-primary/10 border border-primary/10 relative h-full flex flex-col">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-xl font-bold text-primary flex items-center gap-3">
          {icon && <span className="text-2xl">{icon}</span>}
          <span>{title}</span>
          {isStreaming && !isLoading && <span className="w-2 h-2 bg-accent rounded-full animate-pulse"></span>}
        </h3>
        <div className="flex items-center gap-0 flex-shrink-0 -mr-2">
          {onFullscreen && (
            <button
              onClick={onFullscreen}
              disabled={!text || isLoading}
              className="p-2 text-2xl rounded-full hover:bg-primary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Visualizza a schermo intero"
            >
              <span role="img" aria-label="Fullscreen">↗️</span>
            </button>
          )}
          <button
            onClick={handleDownload}
            disabled={!text || isLoading}
            className="p-2 text-2xl rounded-full hover:bg-primary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Scarica file .txt"
          >
            <span role="img" aria-label="Download">💾</span>
          </button>
          <button
            onClick={handleCopy}
            disabled={!text || isLoading}
            className="p-2 text-2xl rounded-full hover:bg-primary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Copia negli appunti"
          >
            {copied ? <span role="img" aria-label="Copied">✅</span> : <span role="img" aria-label="Copy">📋</span>}
          </button>
        </div>
      </div>
      
      {onGenerateLesson && (
        <div className="mb-4">
            <button
                onClick={onGenerateLesson}
                disabled={isLoading || isGeneratingLesson || !text}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 border border-transparent text-base font-bold rounded-full shadow-sm text-white bg-accent hover:bg-rose-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:bg-gray-400 disabled:cursor-not-allowed transition-all transform hover:scale-105"
            >
                {isGeneratingLesson ? <Spinner size="small" /> : <span role="img" aria-label="Craft">✨</span>}
                <span className="ml-1">{isGeneratingLesson ? 'MemoMeow sta elaborando...' : 'Genera Lezione'}</span>
            </button>
        </div>
      )}

      <div className="prose prose-sm max-w-none text-textSecondary flex-grow h-96 overflow-y-auto pr-2 bg-primary/5 p-4 rounded-2xl">
        {renderContent()}
      </div>
    </div>
  );
};