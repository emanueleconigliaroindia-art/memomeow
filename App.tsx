import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Header } from './components/Header';
import { FileUpload } from './components/FileUpload';
import { ResultDisplay } from './components/ResultDisplay';
import { LanguageSelector } from './components/LanguageSelector';
import { Spinner } from './components/Spinner';
import { ToggleSwitch } from './components/ToggleSwitch';
import { transcribeAudioStream, translateTextStream, generateAcademicContent } from './services/geminiService';
import { generatePdf } from './services/pdfGenerator';
import { LANGUAGES } from './constants';
import { getAudioDuration } from './utils/audioUtils';
import { LoveAnimation } from './components/LoveAnimation';


type View = 'setup' | 'results';

const App: React.FC = () => {
  const [view, setView] = useState<View>('setup');
  const [sourceLanguage, setSourceLanguage] = useState<string>('Italiano');
  const [transcription, setTranscription] = useState<string>('');
  const [audioSourceInfo, setAudioSourceInfo] = useState<string>('');
  
  const [wantsTranslation, setWantsTranslation] = useState<boolean>(false);
  const [targetLanguage, setTargetLanguage] = useState<string>('English');
  const [translation, setTranslation] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  
  // Recording state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<number | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // PDF Generation state
  const [isGeneratingLessonOriginal, setIsGeneratingLessonOriginal] = useState<boolean>(false);
  const [isGeneratingLessonTranslated, setIsGeneratingLessonTranslated] = useState<boolean>(false);

  // Pasted/Uploaded transcript state
  const [pastedTranscript, setPastedTranscript] = useState<string>('');
  const [isFileReading, setIsFileReading] = useState<boolean>(false);
  const [fileUploadSuccessMessage, setFileUploadSuccessMessage] = useState<string>('');

  // Fullscreen modal state
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [fullscreenContent, setFullscreenContent] = useState<{ title: string; text: string } | null>(null);

  // Easter Egg State
  const [showGiorgiaModal, setShowGiorgiaModal] = useState<boolean>(false);
  const [showLoveAnimation, setShowLoveAnimation] = useState<boolean>(false);

  const cleanupRecording = useCallback(() => {
      if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
          recordingIntervalRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
      }
      mediaRecorderRef.current = null;
      audioChunksRef.current = [];
      setIsRecording(false);
      setRecordingTime(0);
  }, []);

  useEffect(() => {
    return () => {
      cleanupRecording();
    };
  }, [cleanupRecording]);

  const formatTime = (seconds: number) => {
    const totalSeconds = Math.floor(seconds);
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    
    const paddedHrs = hrs.toString().padStart(2, '0');
    const paddedMins = mins.toString().padStart(2, '0');
    const paddedSecs = secs.toString().padStart(2, '0');

    if (hrs > 0) {
        return `${paddedHrs}:${paddedMins}:${paddedSecs}`;
    }
    return `${paddedMins}:${paddedSecs}`;
  };

  const handleTranscription = async (audioSource: File | Blob, sourceName: string, lang: string) => {
    setView('results');
    setIsLoading(true);
    if (wantsTranslation) {
        setIsTranslating(true);
    }
    setTranscription('');
    setTranslation('');
    setAudioSourceInfo(sourceName);
    setError(null);
    setStatusMessage('MemoMeow sta analizzando il file audio...');

    try {
        const audioFile = audioSource instanceof File ? audioSource : new File([audioSource], "recording.webm", { type: "audio/webm" });
        
        const duration = await getAudioDuration(audioFile);
        setStatusMessage('MemoMeow sta ascoltando attentamente... 😼');

        const stream = await transcribeAudioStream(audioFile, lang, duration);
        
        if (wantsTranslation) {
            let translationBuffer = "";
            const translationPromises: Promise<void>[] = [];

            const translateAndAppend = async (textToTranslate: string) => {
                if (!textToTranslate.trim()) return;
                try {
                    const translationStream = await translateTextStream(textToTranslate, targetLanguage);
                    for await (const chunk of translationStream) {
                        setTranslation(prev => prev + chunk.text);
                    }
                } catch (err: any) {
                    console.error("Parallel translation chunk failed:", err);
                    setError(prev => prev ? `${prev} (Errore parziale trad.)` : "Si è verificato un errore parziale durante la traduzione.");
                }
            };

            for await (const chunk of stream) {
                const text = chunk.text;
                if (text) {
                    setTranscription(prev => prev + text);
                    
                    translationBuffer += text;
                    const lastPunctuationIndex = Math.max(
                        translationBuffer.lastIndexOf('. '),
                        translationBuffer.lastIndexOf('! '),
                        translationBuffer.lastIndexOf('? '),
                        translationBuffer.lastIndexOf('\n')
                    );

                    if (lastPunctuationIndex > -1) {
                        const chunkToTranslate = translationBuffer.substring(0, lastPunctuationIndex + 1);
                        translationBuffer = translationBuffer.substring(lastPunctuationIndex + 1);
                        if (chunkToTranslate.trim()) {
                            translationPromises.push(translateAndAppend(chunkToTranslate));
                        }
                    }
                }
            }

            if (translationBuffer.trim().length > 0) {
                translationPromises.push(translateAndAppend(translationBuffer));
            }
            
            setStatusMessage('MemoMeow sta sfogliando il dizionario... 📖');
            await Promise.all(translationPromises);

        } else {
            // Logic for transcription only
            for await (const chunk of stream) {
                const text = chunk.text;
                if (text) {
                    setTranscription(prev => prev + text);
                }
            }
        }
    } catch (err: any) {
        console.error(err);
        let userMessage = "Si è verificato un errore durante la trascrizione. Riprova.";
        if (err && err.message) {
            const message = err.message.toLowerCase();
            if (message.includes('quota')) {
                userMessage = "Limite di richieste API raggiunto. Riprova più tardi.";
            } else if (message.includes('network') || message.includes('failed to fetch')) {
                userMessage = "Errore di rete. Controlla la tua connessione e riprova.";
            } else if (message.includes('api key not valid')) {
                userMessage = "Chiave API non valida. Controlla la configurazione.";
            } else if (message.includes('audio')) {
                userMessage = "Si è verificato un problema con il file audio. Assicurati che sia un formato supportato e non sia corrotto.";
            }
        }
        setError(userMessage);
    } finally {
        setIsLoading(false);
        setIsTranslating(false);
        setStatusMessage('');
    }
  };

  const startRecording = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (event) => {
            audioChunksRef.current.push(event.data);
        };

        mediaRecorderRef.current.onstop = () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            handleTranscription(audioBlob, 'Registrazione Live', sourceLanguage);
            stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorderRef.current.start();
        setIsRecording(true);
        recordingIntervalRef.current = window.setInterval(() => {
            setRecordingTime(prev => prev + 1);
        }, 1000);

    } catch (err) {
        console.error("Error starting recording:", err);
        setError("Impossibile accedere al microfono. Controlla le autorizzazioni del browser.");
    }
  };

  const stopRecording = () => {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      cleanupRecording();
  };
  
  const handleGenerateLesson = async (
    text: string, 
    language: string, 
    setIsLoadingState: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    if (!text) return;

    setIsLoadingState(true);
    setError(null);
    
    const pdfTab = window.open('', '_blank');
    if (!pdfTab) {
        setError("Impossibile aprire una nuova scheda. Disattiva il blocco pop-up per questo sito e riprova.");
        setIsLoadingState(false);
        return;
    }
    pdfTab.document.write('<html><head><title>Generazione Lezione</title><style>body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f3e8ff; color: #581c87; } .container { text-align: center; } .spinner { border: 4px solid rgba(0, 0, 0, 0.1); width: 36px; height: 36px; border-radius: 50%; border-left-color: #A734FE; animation: spin 1s ease infinite; } @keyframes spin { to { transform: rotate(360deg); } }</style></head><body><div class="container"> <div class="spinner"></div> <p style="margin-top: 1rem;">MemoMeow sta preparando la tua lezione... attendere prego! 🐱✨</p></div></body></html>');

    try {
        const jsonString = await generateAcademicContent(text, language);
        const academicData = JSON.parse(jsonString);
        generatePdf(academicData, pdfTab);
    } catch (err: any) {
        console.error("Error generating lesson:", err);
        if (pdfTab) {
          pdfTab.document.write(`<html><body><h2>Miao! C'è stato un errore!</h2><p>Impossibile generare il PDF. Chiudi questa scheda e riprova.</p><p>Dettagli: ${err.message || 'Errore sconosciuto'}</p></body></html>`);
        }
        let userMessage = "Si è verificato un errore durante la creazione della lezione. Riprova.";
        if (err) {
            if (err instanceof SyntaxError) {
                userMessage = "L'AI ha restituito un formato inaspettato. Non è stato possibile elaborare il contenuto per il PDF.";
            } else if (err.message) {
                const message = err.message.toLowerCase();
                if (message.includes('quota')) {
                    userMessage = "Limite di richieste API raggiunto per l'elaborazione del contenuto. Riprova più tardi.";
                } else if (message.includes('network') || message.includes('failed to fetch')) {
                    userMessage = "Errore di rete durante l'elaborazione. Controlla la tua connessione e riprova.";
                }
            }
        }
        setError(userMessage);
    } finally {
        setIsLoadingState(false);
    }
  };

  const openFullscreen = (title: string, text: string) => {
      setFullscreenContent({ title, text });
      setIsFullscreen(true);
  };
  
  const handleTextFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsFileReading(true);
      setFileUploadSuccessMessage('');
      setError(null);

      // Simulate a short delay for better UX
      setTimeout(() => {
        const reader = new FileReader();
        reader.onload = (event) => {
          setPastedTranscript(event.target?.result as string);
          setFileUploadSuccessMessage(`File "${file.name}" caricato con successo! 🎉`);
          setTimeout(() => setFileUploadSuccessMessage(''), 3000); // Clear message after 3 seconds
        };
        reader.onerror = () => {
          setError('Impossibile leggere il file. Riprova.');
        };
        reader.onloadend = () => {
          setIsFileReading(false);
        };
        reader.readAsText(file);
      }, 500);
    }
    e.target.value = ''; // Allow re-uploading the same file
  };

  const handleStartWithPastedText = () => {
      if (!pastedTranscript.trim()) {
          setError("Il campo della trascrizione non può essere vuoto.");
          return;
      }
      setError(null);
      setTranscription(pastedTranscript);
      setTranslation('');
      setAudioSourceInfo('Trascrizione Incollata');
      setView('results');
  };

  const resetApp = () => {
    setView('setup');
    setTranscription('');
    setTranslation('');
    setAudioSourceInfo('');
    setTargetLanguage('English');
    setSourceLanguage('Italiano');
    setWantsTranslation(false);
    setIsLoading(false);
    setIsTranslating(false);
    setStatusMessage('');
    setError(null);
    setPastedTranscript('');
    cleanupRecording();
  };

  const handleCatClick = () => {
    setShowGiorgiaModal(true);
  };

  const handleGiorgiaResponse = (response: boolean) => {
      setShowGiorgiaModal(false);
      if (response) {
          setShowLoveAnimation(true);
      }
  };
  
  const renderSetup = () => (
    <div className="animate-fade-in">
        <div className="text-center mb-10">
            <h2 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary-dark to-accent mb-2">Ciao, io sono MemoMeow 🐱</h2>
            <p className="text-textSecondary text-lg max-w-2xl mx-auto">Sono il tuo assistente accademico personale, creato con amore da Emanuele per aiutarti a trasformare le lunghe lezioni universitarie in appunti chiari e traduzioni precise. Non perdere mai più un concetto importante!</p>
        </div>

        <div className="space-y-6 max-w-lg mx-auto">
            <LanguageSelector
                id="source-language-selector"
                label="1. Lingua dell'audio 🗣️"
                languages={LANGUAGES}
                selectedLanguage={sourceLanguage}
                onLanguageChange={setSourceLanguage}
            />
            
            <div className="p-4 bg-primary/5 rounded-2xl transition-all">
                <ToggleSwitch
                    label="Vuoi anche la traduzione? 📖"
                    enabled={wantsTranslation}
                    setEnabled={setWantsTranslation}
                />
                {wantsTranslation && (
                    <div className="mt-4 animate-fade-in">
                        <LanguageSelector
                            id="target-language-selector"
                            label="Traduci in: 🌍"
                            languages={LANGUAGES}
                            selectedLanguage={targetLanguage}
                            onLanguageChange={setTargetLanguage}
                        />
                    </div>
                )}
            </div>
        </div>
        
        <div className="mt-10 text-center">
            <h3 className="text-2xl font-bold text-primary mb-4">2. Scegli il Metodo 👇</h3>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <FileUpload onFileSelect={(file) => handleTranscription(file, file.name, sourceLanguage)} disabled={isLoading || isRecording} />
                {!isRecording ? (
                    <button onClick={startRecording} disabled={isLoading} className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 border border-transparent text-base font-bold rounded-full text-white bg-accent hover:bg-rose-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50 transition-all transform hover:scale-105">
                        <span role="img" aria-label="Microphone">🎤</span>
                        Registra Voce
                    </button>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-4 border-2 border-dashed border-red-400 rounded-2xl bg-red-50">
                        <div className="flex items-center text-red-600 font-bold text-lg">
                            <span className="relative flex h-3 w-3 mr-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                            </span>
                            In Registrazione: {formatTime(recordingTime)}
                        </div>
                        <button onClick={stopRecording} className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-full text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                           <span role="img" aria-label="Stop">⏹️</span>
                           Ferma e Trascrivi
                        </button>
                    </div>
                )}
            </div>
        </div>
        <div className="my-10 text-center"><span role="img" aria-label="Cat paw">🐾</span></div>
        
        <div className="bg-primary/5 p-6 rounded-3xl border border-primary/20">
          <div className="text-center mb-4">
              <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary-dark to-accent">Hai già una trascrizione? ✍️</h2>
              <p className="text-textSecondary mt-2">Incolla il testo qui sotto o carica un file .txt per iniziare.</p>
          </div>
          <textarea
              className="w-full h-40 p-4 border-2 border-primary/20 rounded-2xl focus:ring-primary focus:border-primary transition bg-white text-gray-800 placeholder-gray-400"
              placeholder="Incolla qui la tua trascrizione..."
              value={pastedTranscript}
              onChange={(e) => setPastedTranscript(e.target.value)}
              disabled={isLoading || isRecording || isFileReading}
          />
          <div className="mt-4 flex flex-col sm:flex-row gap-4 justify-center">
              <input type="file" id="text-upload" className="hidden" accept=".txt" onChange={handleTextFileUpload} disabled={isLoading || isRecording || isFileReading} />
              <label htmlFor="text-upload" className={`flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 border border-transparent text-base font-bold rounded-full text-primary bg-primary/20 hover:bg-primary/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all transform hover:scale-105 ${isLoading || isRecording || isFileReading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                  {isFileReading ? (
                      <>
                          <Spinner size="small" />
                          <span className="ml-2">MemoMeow sta leggendo...</span>
                      </>
                  ) : (
                     <>
                        <span role="img" aria-label="File">📄</span>
                        Carica File .txt
                     </>
                  )}
              </label>
              <button onClick={handleStartWithPastedText} disabled={!pastedTranscript.trim() || isLoading || isRecording || isFileReading} className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 border border-transparent text-base font-bold rounded-full text-white bg-primary hover:bg-primary-dark disabled:bg-gray-400 disabled:cursor-not-allowed transition-all transform hover:scale-105">
                  <span role="img" aria-label="Sparkles">✨</span>
                  Elabora Trascrizione
              </button>
          </div>
          {fileUploadSuccessMessage && (
            <p className="text-center text-green-600 font-medium mt-4 animate-fade-in">
              {fileUploadSuccessMessage}
            </p>
          )}
        </div>
    </div>
  );

  const renderResults = () => (
    <div className="animate-fade-in">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
            <div>
                <h2 className="text-2xl font-bold text-primary">I tuoi Risultati! ✨</h2>
                <p className="font-normal text-textSecondary">{audioSourceInfo}</p>
            </div>
            <button
                onClick={resetApp}
                className="text-sm font-semibold text-primary hover:text-primary-dark transition-colors px-4 py-2 rounded-full bg-primary-light/20"
            >
                Inizia di Nuovo
            </button>
        </div>
        
        {(isLoading || isTranslating) && (
            <div className="my-4 p-4 bg-primary-light/10 rounded-2xl flex items-center justify-center">
              <Spinner size="small" />
              <p className="ml-3 font-medium text-primary">{statusMessage || (isTranslating ? 'MemoMeow sta traducendo...' : 'MemoMeow sta elaborando...')}</p>
            </div>
        )}

        {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-2xl my-4" role="alert">
                <strong className="font-bold">Miao, un errore! 😿 </strong>
                <span className="block sm:inline">{error}</span>
            </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <ResultDisplay 
                title={`Trascrizione Originale (${sourceLanguage})`} 
                text={transcription} 
                isStreaming={isLoading && !!transcription}
                isLoading={isLoading && !transcription}
                icon="🎤"
                onGenerateLesson={() => handleGenerateLesson(transcription, sourceLanguage, setIsGeneratingLessonOriginal)}
                isGeneratingLesson={isGeneratingLessonOriginal}
                onFullscreen={() => openFullscreen(`Trascrizione Originale (${sourceLanguage})`, transcription)}
            />
            {wantsTranslation && (
                <ResultDisplay 
                    title={`Traduzione in ${targetLanguage}`} 
                    text={translation} 
                    isStreaming={isTranslating}
                    isLoading={(isLoading && !transcription) || (!!transcription && !translation && !isTranslating)}
                    icon="✍️"
                    onGenerateLesson={() => handleGenerateLesson(translation, targetLanguage, setIsGeneratingLessonTranslated)}
                    isGeneratingLesson={isGeneratingLessonTranslated}
                    onFullscreen={() => openFullscreen(`Traduzione in ${targetLanguage}`, translation)}
                />
            )}
        </div>
    </div>
  );


  return (
    <>
      {showGiorgiaModal && (
        <div className="modal-backdrop animate-fade-in">
            <div className="bg-surface p-8 rounded-4xl shadow-2xl text-center max-w-sm w-full mx-4">
                <h2 className="text-3xl font-bold text-textPrimary mb-6">Sei Giorgia?</h2>
                <div className="flex gap-4 justify-center">
                    <button onClick={() => handleGiorgiaResponse(true)} className="px-8 py-3 bg-accent text-white font-bold rounded-full text-lg transform hover:scale-105 transition-transform">Sì ❤️</button>
                    <button onClick={() => handleGiorgiaResponse(false)} className="px-8 py-3 bg-gray-200 text-textSecondary font-bold rounded-full text-lg transform hover:scale-105 transition-transform">No</button>
                </div>
            </div>
        </div>
      )}
      {showLoveAnimation && <LoveAnimation onAnimationEnd={() => setShowLoveAnimation(false)} />}

      {isFullscreen && fullscreenContent && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center animate-fade-in p-4">
            <div className="bg-surface rounded-4xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-primary">{fullscreenContent.title}</h2>
                    <button onClick={() => setIsFullscreen(false)} className="p-2 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors">
                        <span role="img" aria-label="Close">❌</span>
                    </button>
                </div>
                <div className="p-6 flex-grow overflow-y-auto text-textPrimary">
                    {fullscreenContent.text.split('\n').map((line, index) => {
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
                    })}
                </div>
            </div>
        </div>
      )}
      <div className="min-h-screen bg-background text-textPrimary font-sans">
        <Header onCatClick={handleCatClick} />
        <main className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="bg-surface p-6 sm:p-10 rounded-4xl shadow-2xl shadow-primary/20 transition-all duration-300">
            {view === 'setup' && renderSetup()}
            {view === 'results' && renderResults()}
          </div>
          <footer className="text-center mt-8 text-textSecondary text-sm">
              <p>
                  <strong>MemoMeow</strong> - L'assistente accademico creato con amore da Emanuele 🐾
              </p>
            <p className="mt-1">Powered by Gemini API. © 2024</p>
          </footer>
        </main>
      </div>
    </>
  );
};

export default App;