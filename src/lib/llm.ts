import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

if (!import.meta.env.VITE_OPENAI_API_KEY) {
  throw new Error('Missing VITE_OPENAI_API_KEY environment variable');
}

if (!import.meta.env.VITE_GOOGLE_API_KEY) {
  throw new Error('Missing VITE_GOOGLE_API_KEY environment variable');
}

export const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Note: In production, you should use a backend proxy
});

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GOOGLE_API_KEY);

export const gemini = genAI.getGenerativeModel({ 
  model: "gemini-2.0-flash",
  generationConfig: {
    temperature: 0.7,
    topK: 40,
    topP: 0.9,
    maxOutputTokens: 1024,
  },
}); 