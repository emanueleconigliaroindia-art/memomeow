import React from 'react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  disabled: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, disabled }) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
       if (files[0].type.startsWith('audio/')) {
        onFileSelect(files[0]);
      } else {
        alert("Per favore, carica un file audio valido. I nostri gattini non sanno leggere altri formati! 😿");
      }
    }
  };

  return (
    <>
        <input
            type="file"
            id="file-upload"
            className="hidden"
            accept="audio/*"
            onChange={handleFileChange}
            disabled={disabled}
        />
        <label
            htmlFor="file-upload"
            className={`flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 border border-transparent text-base font-bold rounded-full text-primary bg-primary/20 hover:bg-primary/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 transition-all transform hover:scale-105 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        >
            <span role="img" aria-label="Upload file">📁</span>
            Carica File Audio
        </label>
    </>
  );
};
