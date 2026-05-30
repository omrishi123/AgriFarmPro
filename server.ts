import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const port = 3000;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '20mb' }));

  // Initialize server-side Google GenAI client
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({
    apiKey: geminiApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const SYSTEM_INSTRUCTION = "You are an expert agronomist and farm management assistant. Answer questions regarding crop diseases, yield optimization, weather preparation, and farming best practices based on the user's input. Be concise, practical, and helpful.";

  // API router for server-side Gemini execution
  app.post('/api/gemini/chat', async (req, res) => {
    try {
      if (!geminiApiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server-side environment." });
      }

      const { messages, imageBase64 } = req.body;
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Invalid 'messages' format, expected array of objects." });
      }

      // Extract current user payload
      const lastMsg = messages[messages.length - 1];
      const messageContent = lastMsg.content;

      let response;

      // Handle Gemini Vision if image exists
      if (imageBase64) {
        // base64 check
        const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
        
        response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: [
            messageContent || "Please analyze this crop image and offer professional agricultural solutions regarding any visible diseases or care tips.",
            {
              inlineData: {
                data: base64Data,
                mimeType: "image/jpeg"
              }
            }
          ],
          config: {
            systemInstruction: SYSTEM_INSTRUCTION
          }
        });
      } else {
        // Standard chat generation
        const formattedHistory = messages.map(m => ({
          role: m.role,
          parts: [{ text: m.content }]
        }));

        response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: formattedHistory,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION
          }
        });
      }

      const content = response.text || "No response received.";
      return res.json({ content });
    } catch (error: any) {
      console.error("Gemini Server Error:", error);
      return res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // Serve static files / Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(port, "0.0.0.0", () => {
    console.log(`Express server running on http://localhost:${port}`);
  });
}

startServer();
