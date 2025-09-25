import React from 'react';
import { LANGUAGE_FLAGS } from '../constants';

interface LanguageSelectorProps {
  id: string;
  label: string;
  languages: string[];
  selectedLanguage: string;
  onLanguageChange: (language: string) => void;
  disabled?: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  id,
  label,
  languages,
  selectedLanguage,
  onLanguageChange,
  disabled = false,
}) => {
  return (
    <div className="w-full">
      <label htmlFor={id} className="block text-md font-semibold text-textPrimary mb-2">
        {label}
      </label>
      <select
        id={id}
        value={selectedLanguage}
        onChange={(e) => onLanguageChange(e.target.value)}
        disabled={disabled}
        className="block w-full pl-4 pr-10 py-3 text-base font-medium bg-white text-gray-900 border-2 border-primary/20 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-xl disabled:bg-gray-100 disabled:cursor-not-allowed"
      >
        {languages.map((lang) => (
          <option key={lang} value={lang} className="text-gray-900 bg-white font-medium">
            {LANGUAGE_FLAGS[lang] || '🏳️'} {lang}
          </option>
        ))}
      </select>
    </div>
  );
};
