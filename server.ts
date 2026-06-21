import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '15mb' }));

// Initialize Gemini API
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;
if (apiKey) {
  aiClient = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
} else {
  console.warn('Warning: GEMINI_API_KEY is not set in environment or secrets.');
}

// Full-stack API chat streaming route
app.post('/api/chat', async (req, res) => {
  try {
    if (!aiClient) {
      return res.status(500).json({ error: 'Gemini API not configured. Please supply a GEMINI_API_KEY in secrets.' });
    }

    const { message, image, history, systemInstruction } = req.body;

    const formattedContents: any[] = [];
    
    // Process historic messages
    if (history && Array.isArray(history)) {
      history.forEach((h: any) => {
        formattedContents.push({
          role: h.role, // 'user' or 'model'
          parts: [{ text: h.text }]
        });
      });
    }

    // Add current message parts (include image if uploaded)
    const currentParts: any[] = [];
    if (image && image.data && image.mimeType) {
      // Decode image base64
      const base64Data = image.data.split(',')[1] || image.data;
      currentParts.push({
        inlineData: {
          mimeType: image.mimeType,
          data: base64Data,
        }
      });
    }
    
    currentParts.push({ text: message });
    formattedContents.push({
      role: 'user',
      parts: currentParts
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await aiClient.models.generateContentStream({
      model: 'gemini-3.5-flash',
      contents: formattedContents,
      config: systemInstruction ? { systemInstruction } : undefined,
    });

    for await (const chunk of stream) {
      if (chunk.text) {
        res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
      }
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err: any) {
    console.error('Gemini API Error:', err);
    res.status(500).json({ error: err.message || 'Error communicating with Gemini API' });
  }
});

// Serve frontend build in production
const distPath = path.join(process.cwd(), 'dist');
app.use(express.static(distPath));

// Fallback for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Dot AI custom server running on port ${PORT}`);
});
