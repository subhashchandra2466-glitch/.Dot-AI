import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, Plugin} from 'vite';
import { GoogleGenAI } from '@google/genai';

function apiMiddlewarePlugin(): Plugin {
  return {
    name: 'api-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/api/chat' && req.method === 'POST') {
          try {
            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'GEMINI_API_KEY is not defined in Secrets.' }));
              return;
            }

            const ai = new GoogleGenAI({
              apiKey,
              httpOptions: {
                headers: {
                  'User-Agent': 'aistudio-build',
                },
              },
            });

            // Parse body
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', async () => {
              try {
                const { message, image, history, systemInstruction } = JSON.parse(body);

                const formattedContents: any[] = [];
                if (history && Array.isArray(history)) {
                  history.forEach((h: any) => {
                    formattedContents.push({
                      role: h.role,
                      parts: [{ text: h.text }]
                    });
                  });
                }

                // Add current message parts
                const currentParts: any[] = [];
                if (image && image.data && image.mimeType) {
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

                res.writeHead(200, {
                  'Content-Type': 'text/event-stream',
                  'Cache-Control': 'no-cache',
                  'Connection': 'keep-alive',
                });

                const stream = await ai.models.generateContentStream({
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
              } catch (innerError: any) {
                console.error('Inner Gemini API Error:', innerError);
                if (!res.headersSent) {
                  res.writeHead(500, { 'Content-Type': 'application/json' });
                }
                res.end(JSON.stringify({ error: innerError.message || 'Error processing request' }));
              }
            });
          } catch (outerError: any) {
            console.error('Outer Gemini Middleware Error:', outerError);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: outerError.message || 'Server Initialization Error' }));
          }
        } else {
          next();
        }
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), apiMiddlewarePlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
