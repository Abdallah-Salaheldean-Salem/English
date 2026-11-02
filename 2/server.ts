import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json({ limit: '1mb' }));

  // API route to get the raw recovery plan markdown
  app.get('/api/plan', (_req, res) => {
    try {
      const planPath = path.resolve(process.cwd(), 'public/assets/aistudio/English_Writing_Recovery_Plan_f683dcef.md');
      if (fs.existsSync(planPath)) {
        const content = fs.readFileSync(planPath, 'utf-8');
        return res.json({ content });
      }
      return res.status(404).json({ error: 'Plan document not found' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Strict Post-Draft Diagnostic Coach API
  // Strictly enforces the King plan rule:
  // "AI marks errors after the draft, without fixing them: You still do the repair, which is the learning."
  // "AI drafts or rewrites any sentence: NEVER."
  app.post('/api/analyze-errors', async (req, res) => {
    const { text, phase = 1, drillType = '' } = req.body;
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'Draft text is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY is not configured in environment. Deterministic analysis will be used.',
        fallback: true
      });
    }

    try {
      const ai = new GoogleGenAI();
      const prompt = `You are the mentor and diagnostic writing coach for a student working through the "English Writing Recovery Plan" by @King.
The student is rebuilding their unaided English writing ability after developing cognitive debt from AI autocomplete and drafting tools.

CRITICAL MENTOR CONSTITUTION (VIOLATION IS STRICTLY FORBIDDEN):
1. NEVER rewrite, fix, or provide the corrected version of any sentence.
2. NEVER output replacement phrasing or drafted sentences.
3. The student MUST do the repair themselves to rebuild neural sentence fluency.
4. Point out between 2 and 5 specific problems in the student's text.
5. If Phase 1: verify the sentence rules (one idea per sentence, subject & verb in first 5 words, 10-20 words per sentence, simplicity).
6. Categorize each error into one of the tracker categories:
   - "Missing article"
   - "Article with plural"
   - "Missing 'to' before a verb"
   - "Noun used as an adjective"
   - "Spelling"
   - "Sentence too long (>20 words)"
   - "Delayed subject/verb (>5 words)"
   - "Run-on sentence"
   - "Word choice / precision"
   - "Punctuation / comma splice"
7. Explain the grammatical rule clearly in 1-2 sentences, and pose a self-repair guiding question so the user can fix it on their own.

Context: Phase ${phase} practice. Drill: ${drillType || 'General Unaided Draft'}.

Student's unaided draft:
"""
${text}
"""

Respond ONLY with valid JSON conforming to this schema:
{
  "summary": "1-2 short sentences evaluating sentence cadence, flow, and unaided progress (no rewrite hints).",
  "wordCount": number,
  "errors": [
    {
      "type": "Missing article | Article with plural | Missing 'to' before a verb | Noun used as an adjective | Spelling | Sentence too long (>20 words) | Delayed subject/verb | Run-on sentence | Word choice / precision | Punctuation / comma splice",
      "snippet": "exact faulty phrase or snippet from student text",
      "sentence": "the full sentence containing the issue",
      "ruleExplanation": "Clear, direct explanation of the grammar rule without providing the solution",
      "hintQuestion": "A guiding question prompting the student to correct it themselves"
    }
  ]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        }
      });

      const responseText = response.text?.trim() || '{}';
      const parsed = JSON.parse(responseText);
      return res.json(parsed);
    } catch (err: any) {
      console.error('Gemini error analysis failed:', err);
      return res.status(500).json({ error: err.message || 'Diagnostic analysis failed' });
    }
  });

  // Mount Vite dev middleware or serve production dist
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Unaided Studio server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
