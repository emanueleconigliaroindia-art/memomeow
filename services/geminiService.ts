import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  const base64EncodedData = await base64EncodedDataPromise;
  return {
    inlineData: {
      data: base64EncodedData,
      mimeType: file.type,
    },
  };
};

export const transcribeAudioStream = async (
    audioFile: File, 
    sourceLanguage: string,
    duration: number
) => {
  const audioPart = await fileToGenerativePart(audioFile);
  
  const isLongAudio = duration >= 3600;

  // This provides a much stricter context for timestamp generation based on the audio's actual length.
  const timestampFormatInstruction = isLongAudio 
    ? `Timestamps must be formatted EXACTLY as \`[HH:MM:SS]\`. HH, MM, and SS must ALWAYS be two digits (e.g., \`[01:23:45]\`).`
    : `The audio is shorter than one hour. Timestamps must be formatted EXACTLY as \`[00:MM:SS]\`. The hour part MUST be '00'. For example: \`[00:41:31]\`.`;

  // This new system instruction uses a "zero tolerance" policy and frames the anti-looping
  // rule as the AI's primary, non-negotiable directive to ensure stability.
  const systemInstruction = `Your identity is a transcription engine. Your single purpose is to transcribe audio. Your performance is measured by your adherence to the following core directives. Failure to follow them is a critical error.

---
**CORE DIRECTIVE 1: ABSOLUTE ANTI-LOOP RULE (ZERO TOLERANCE)**
- This is your most important instruction.
- You are strictly forbidden from repeating any portion of the transcription.
- You must only progress forward through the audio.
- If you detect a loop or repetition is about to occur, you must immediately cease generating text. This is not a suggestion, it is a hard stop command.
---

**CORE DIRECTIVE 2: STOP AT THE END**
- Once the audio file is fully transcribed, your task is complete.
- You MUST stop generating text immediately. Do not add a summary, do not add notes, do not restart.

**CORE DIRECTIVE 3: PRECISE FORMATTING**
- ${timestampFormatInstruction}
- There must be ZERO spaces inside the brackets. Example of forbidden format: \`[ 03:09:05 ]\`.
- Transcribe in the target language: **${sourceLanguage}**.
- Use \`[non udibile]\` for inaudible segments.

Adherence to the ANTI-LOOP RULE is the primary measure of your success.
`;

  const chat = ai.chats.create({
    model: 'gemini-2.5-flash',
    config: { systemInstruction },
  });

  // Corrected a critical bug in the API call format that was causing instability and looping.
  // This ensures the audio data is sent in a stable manner.
  const stream = await chat.sendMessageStream({ message: [audioPart] });
  
  return stream;
};

export const translateTextStream = async (text: string, targetLanguage: string) => {
  const prompt = `Sei un traduttore accademico esperto. Il tuo compito è tradurre il seguente testo, che è la trascrizione di una lezione universitaria.

Traduci in: ${targetLanguage}.

Segui rigorosamente queste istruzioni e vincoli di stile:
1.  **Traduzione Accurata**: Genera una traduzione accurata e naturale, adatta a un contesto universitario.
2.  **Fedeltà Terminologica**: Mantieni i termini tecnici e i nomi propri invariati o traducili con il loro equivalente ufficiale.
3.  **Glosse**: Dove necessario per chiarezza, aggiungi brevi glosse esplicative tra parentesi per termini specifici.
4.  **Sigle e Abbreviazioni**: Normalizza sigle e abbreviazioni. Scioglile fornendo il nome completo alla loro prima occorrenza, seguito dalla sigla tra parentesi (es. "Organizzazione delle Nazioni Unite (ONU)").
5.  **Stile**: Il tono deve essere chiaro, didattico e scorrevole.
6.  **Mantieni Annotazioni**: Rispetta e mantieni nel testo tradotto le annotazioni originali come "[non udibile]", "[incerto]" o i timestamp come "[HH:MM:SS]".

Testo da tradurre:
---
${text}
---`;

  const stream = await ai.models.generateContentStream({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  return stream;
};

export const generateAcademicContent = async (transcript: string, language: string): Promise<string> => {
    // Rimuoviamo i timestamp per non confondere l'AI che deve elaborare il contenuto.
    const cleanTranscript = transcript.replace(/\[\d{2}:\d{2}:\d{2}\]\s?/g, '');
    
    const prompt = `Sei un professore universitario e un autore accademico esperto. Il tuo compito è trasformare la seguente trascrizione grezza di una lezione in un documento accademico completo, ben strutturato e approfondito, adatto a studenti universitari. L'intero output deve essere nella lingua: **${language}**.

Trascrizione della Lezione:
---
${cleanTranscript}
---

Segui queste istruzioni per generare il contenuto in formato JSON:
1.  **Lingua**: L'intero documento, inclusi titoli, contenuti e descrizioni, deve essere scritto in **${language}**.
2.  **Titolo**: Crea un titolo conciso e accademico per la lezione.
3.  **Introduzione**: Scrivi un paragrafo introduttivo che riassuma gli argomenti principali e gli obiettivi della lezione.
4.  **Sezioni**: Organizza il contenuto in sezioni logiche. Per ogni sezione:
    *   Crea un'intestazione (heading) chiara e descrittiva.
    *   **Sii Discorsivo e Approfondito**: Non limitarti a parafrasare la trascrizione. Il tuo compito è ESPANDERE SIGNIFICATIVAMENTE ogni concetto. Per ogni argomento trattato:
        *   Fornisci definizioni dettagliate e precise.
        *   Includi esempi pratici e concreti per illustrare i concetti.
        *   Aggiungi contesto storico, teorico o pratico che arricchisca la comprensione.
        *   Confronta e contrapponi idee correlate.
        *   L'obiettivo è trasformare un discorso parlato in un capitolo di un libro di testo. Il testo generato per ogni sezione deve essere molto più lungo e dettagliato del segmento di trascrizione corrispondente.
    *   Usa una prosa formale e accademica.
5.  **Conclusione**: Scrivi un paragrafo conclusivo che riassuma i punti chiave e offra spunti per ulteriori riflessioni o studi.
6.  **Stile**: Usa un linguaggio formale, chiaro e preciso. Evita un tono colloquiale.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING, description: "Titolo accademico della lezione." },
                    introduction: { type: Type.STRING, description: "Paragrafo introduttivo che riassuma gli obiettivi della lezione." },
                    sections: {
                        type: Type.ARRAY,
                        description: "Elenco delle sezioni della lezione.",
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                heading: { type: Type.STRING, description: "Intestazione della sezione." },
                                content: {
                                    type: Type.ARRAY,
                                    description: "Paragrafi di contenuto per la sezione, riscritti in stile accademico e approfonditi.",
                                    items: { type: Type.STRING }
                                }
                            },
                            required: ["heading", "content"]
                        }
                    },
                    conclusion: { type: Type.STRING, description: "Paragrafo conclusivo che riassuma i punti chiave." }
                },
                required: ["title", "introduction", "sections", "conclusion"]
            }
        }
    });

    return response.text;
};