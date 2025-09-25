export const getAudioDuration = (file: File): Promise<number> => {
  return new Promise((resolve, reject) => {
    const audio = document.createElement('audio');
    audio.preload = 'metadata';
    
    audio.onloadedmetadata = () => {
      window.URL.revokeObjectURL(audio.src);
      resolve(audio.duration);
    };

    audio.onerror = () => {
        window.URL.revokeObjectURL(audio.src);
        reject(new Error("Failed to load audio metadata. The file might be corrupted."));
    }

    audio.src = window.URL.createObjectURL(file);
  });
};
