import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '2mb' }));

// Server-side Gemini initialization
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Endpoint: Automated Diagnosis for English Writing Recovery
app.post('/api/review', async (req: Request, res: Response) => {
  try {
    const { text, knownErrorTypes, top3, phase, kind } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text content is required for review.' });
    }

    if (!process.env.GEMINI_API_KEY) {
      // Fallback response if API key is not yet configured in Secrets
      return res.status(200).json({
        marks: [],
        generalFeedback: 'Gemini API key is not configured. Please use Guided Self-Check mode or attach your API key in Settings > Secrets.',
        fluencyScore: 85,
        isFallback: true,
      });
    }

    const systemInstruction = `
You are the master editor and linguistic coach for the English Writing Recovery Plan.
Your job is to identify legitimate grammatical errors, structural breakdowns, punctuation errors, tense shifts, article errors, preposition slips, and awkward collocations in the writer's text.

CRITICAL RECOVERY RULE:
1. NEVER supply the corrected sentence or tell the writer the exact replacement word! The plan's pedagogical rule demands that the writer finds and executes the repair themselves.
2. The "quote" field MUST be an EXACT, VERBATIM substring match from the user's text.
3. The "type" should be a standard linguistic error category (e.g., "Subject-Verb Agreement", "Missing / Misused Article", "Tense Shift", "Comma Splice / Run-on", "Sentence Fragment", "Preposition Choice", "Parallel Structure", "Pronoun Reference", "Dangling / Misplaced Modifier", "Word Choice / Collocation").
4. If the user has known target errors (${top3?.join(', ') || 'none specified'}), pay special attention to occurrences of those categories.
5. The "hint" should be a prompt or targeted question (e.g. "Look at the subject of this clause: is it singular or plural?", "Check which preposition idiomatically accompanies this adjective.").
6. The "note" should be a brief one-sentence explanation of the linguistic rule.
7. Return at most 5-8 of the most instructive errors per review to prevent overwhelming the writer. If the text is error-free, return an empty marks array and positive feedback.
`;

    const prompt = `Review this writing passage (Phase: ${phase || 1}, Kind: ${kind || 'writing'}):\n\n"""\n${text}\n"""`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            marks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  quote: { type: Type.STRING, description: 'Exact verbatim substring from user text' },
                  type: { type: Type.STRING, description: 'Standard error category name' },
                  hint: { type: Type.STRING, description: 'Guiding hint or prompt without revealing direct fix' },
                  note: { type: Type.STRING, description: 'Grammar rule explanation' },
                },
                required: ['quote', 'type', 'hint', 'note'],
              },
            },
            generalFeedback: {
              type: Type.STRING,
              description: 'Constructive 2-3 sentence overview of writing rhythm, clarity, and strengths',
            },
            fluencyScore: {
              type: Type.NUMBER,
              description: 'Estimated readability/fluency score out of 100',
            },
          },
          required: ['marks', 'generalFeedback'],
        },
      },
    });

    const outputText = response.text || '{}';
    const parsed = JSON.parse(outputText);

    // Filter marks to ensure quote actually exists in text
    if (Array.isArray(parsed.marks)) {
      parsed.marks = parsed.marks.filter((m: { quote: string }) => m.quote && text.includes(m.quote));
    }

    return res.json(parsed);
  } catch (error: any) {
    console.error('Error during writing review:', error);
    return res.status(500).json({
      error: 'Failed to process AI review.',
      message: error?.message || 'Unknown error occurred.',
    });
  }
});

// Endpoint: Check user's attempted repair without spoiling answers
app.post('/api/check-repair', async (req: Request, res: Response) => {
  try {
    const { originalQuote, userFix, errorType, hint, contextSentence } = req.body;

    if (!userFix || typeof userFix !== 'string') {
      return res.status(400).json({ error: 'Repair text is required.' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(200).json({
        passed: true,
        feedback: 'Marked as repaired (offline/self-evaluation mode).',
      });
    }

    const systemInstruction = `
You are the evaluator verifying a writer's attempted repair of an English grammar/style mark.
The writer had an error of type "${errorType}" on the original text: "${originalQuote}".
Sentence context: "${contextSentence || ''}"
Hint previously provided: "${hint || ''}"
The writer's proposed repair: "${userFix}"

Verify whether the repair solves the specific error cleanly without introducing new syntax or grammatical errors.
If passed is false, do NOT reveal the exact words. Instead, explain what still needs attention.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Evaluate repair: "${userFix}" for original error "${originalQuote}".`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            passed: { type: Type.BOOLEAN },
            feedback: { type: Type.STRING, description: 'Evaluation note without giving away the exact answer' },
          },
          required: ['passed', 'feedback'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{"passed": false, "feedback": "Could not verify"}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error during repair check:', error);
    return res.status(500).json({ error: 'Failed to verify repair.' });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`English Writing Recovery server running on http://localhost:${PORT}`);
  });
}

startServer();
