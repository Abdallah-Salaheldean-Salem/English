import { DetectedError } from '../types';

export interface SentenceStats {
  text: string;
  wordCount: number;
  isOverLimit: boolean; // >20 words in phase 1, >25 words in phase 2
  startsTooSlow: boolean; // subject/verb delayed beyond word 5
  hasArticlePlural: boolean;
  hasMissingTo: boolean;
}

export interface WritingAnalysis {
  wordCount: number;
  sentenceCount: number;
  avgSentenceLength: number;
  sentences: SentenceStats[];
  detectedErrors: DetectedError[];
  phase1Compliance: {
    wordsPerSentenceOk: boolean;
    hasOverlongSentences: boolean;
    overlongCount: number;
  };
}

export function analyzeProse(text: string, phase: number = 1): WritingAnalysis {
  if (!text || text.trim().length === 0) {
    return {
      wordCount: 0,
      sentenceCount: 0,
      avgSentenceLength: 0,
      sentences: [],
      detectedErrors: [],
      phase1Compliance: {
        wordsPerSentenceOk: true,
        hasOverlongSentences: false,
        overlongCount: 0
      }
    };
  }

  // Tokenize sentences cleanly
  const rawSentences = text
    .replace(/([.?!])\s+(?=[A-Z0-9])/g, '$1|')
    .split('|')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  const maxLen = phase === 1 ? 20 : 25;
  const detectedErrors: DetectedError[] = [];
  const sentenceStats: SentenceStats[] = [];
  let totalWords = 0;
  let overlongCount = 0;

  for (const s of rawSentences) {
    const words = s.split(/\s+/).filter(w => w.length > 0);
    const count = words.length;
    totalWords += count;

    const isOver = count > maxLen;
    if (isOver) {
      overlongCount++;
      detectedErrors.push({
        type: `Sentence too long (>${maxLen} words)`,
        snippet: words.slice(0, 7).join(' ') + '...',
        sentence: s,
        ruleExplanation: `Phase ${phase} rule: keep sentences between 10–${maxLen} words so you maintain total control of the syntax. Longer sentences easily lose clarity and pile on excess clauses.`,
        hintQuestion: `Where can you break this ${count}-word sentence into two independent thoughts? Find the pivot and replace it with a period.`
      });
    }

    // Heuristic: Article before plural (e.g. "a examples", "a problems", "an users")
    const articlePluralMatch = s.match(/\b(a|an)\s+([a-z]+s)\b/i);
    let hasArticlePlural = false;
    if (articlePluralMatch && !isExemptPlural(articlePluralMatch[2])) {
      hasArticlePlural = true;
      detectedErrors.push({
        type: 'Article with a plural',
        snippet: articlePluralMatch[0],
        sentence: s,
        ruleExplanation: `The indefinite article 'a' or 'an' can only modify singular countable nouns. Plural nouns cannot take 'a' or 'an'.`,
        hintQuestion: `Should you delete the article ('${articlePluralMatch[2]}') or make the noun singular?`
      });
    }

    // Heuristic: Missing 'to' after 'how' before bare verb (e.g., "how produce", "how do", "how create" without auxiliary/infinitive)
    const missingToMatch = s.match(/\bhow\s+(produce|create|fix|build|test|handle|write|make|solve|run|deploy)\b/i);
    let hasMissingTo = false;
    if (missingToMatch) {
      hasMissingTo = true;
      detectedErrors.push({
        type: "Missing 'to' before a verb",
        snippet: missingToMatch[0],
        sentence: s,
        ruleExplanation: `When expressing a method or procedure after 'how', an infinitive requires 'to' (e.g., 'how to produce').`,
        hintQuestion: `Insert 'to' between 'how' and the action verb.`
      });
    }

    // Heuristic: Delayed subject/verb in Phase 1
    // If the sentence starts with a long introductory clause > 5 words before main punctuation or verb
    let startsTooSlow = false;
    if (phase === 1 && words.length >= 7) {
      const firstFive = words.slice(0, 5).join(' ').toLowerCase();
      // If first five words are purely prepositional/introductory (e.g., "In the middle of the", "Because of the great difficulty")
      if (/^(in\s+the|because\s+of|due\s+to|after\s+a\s+long|during\s+the|at\s+the\s+very)\b/i.test(firstFive)) {
        startsTooSlow = true;
        detectedErrors.push({
          type: 'Delayed subject/verb',
          snippet: firstFive + '...',
          sentence: s,
          ruleExplanation: `Phase 1 rule: Put the subject and verb within the first 5 words. Front-loading the actor and action gives English sentences immediate punch.`,
          hintQuestion: `Who did what? Restructure this sentence so the subject and verb appear immediately at the start.`
        });
      }
    }

    sentenceStats.push({
      text: s,
      wordCount: count,
      isOverLimit: isOver,
      startsTooSlow,
      hasArticlePlural,
      hasMissingTo
    });
  }

  const avgLength = rawSentences.length > 0 ? Math.round(totalWords / rawSentences.length) : 0;

  return {
    wordCount: totalWords,
    sentenceCount: rawSentences.length,
    avgSentenceLength: avgLength,
    sentences: sentenceStats,
    detectedErrors,
    phase1Compliance: {
      wordsPerSentenceOk: overlongCount === 0,
      hasOverlongSentences: overlongCount > 0,
      overlongCount
    }
  };
}

function isExemptPlural(word: string): boolean {
  const exemptions = ['always', 'yes', 'this', 'gas', 'glass', 'grass', 'bus', 'plus', 'lens', 'series', 'species', 'status', 'focus'];
  return exemptions.includes(word.toLowerCase());
}
