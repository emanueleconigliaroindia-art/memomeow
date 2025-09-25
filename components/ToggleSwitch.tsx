import React from 'react';

interface ToggleSwitchProps {
  label: string;
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ label, enabled, setEnabled }) => {
  return (
    <div className="flex items-center justify-between">
      <label htmlFor="toggle" className="font-semibold text-textPrimary text-md">
        {label}
      </label>
      <button
        id="toggle"
        onClick={() => setEnabled(!enabled)}
        className={`${
          enabled ? 'bg-primary' : 'bg-gray-300'
        } relative inline-flex items-center h-7 rounded-full w-12 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary`}
      >
        <span
          className={`${
            enabled ? 'translate-x-6' : 'translate-x-1'
          } inline-block w-5 h-5 transform bg-white rounded-full transition-transform duration-300 shadow-md`}
        />
      </button>
    </div>
  );
};
