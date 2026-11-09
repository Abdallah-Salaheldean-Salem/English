/* Fake Claude answers for the Phase 0 and imitation prompts, shared by test/e2e.js (pasted replies and the mocked viewer). */
'use strict';
function phase0Answer(prompt) {
  if (prompt.startsWith('You are marking a grammar test')) {
    const placement = prompt.includes('She work in a lab every day.');
    return Array.from({ length: 10 }, (_, i) => ({ n: i + 1, ok: placement ? ![4, 7].includes(i + 1) : true, type: i + 1 === 4 ? 'Missing article' : "its vs it's", hint: 'Look at the noun before it.' }));
  }
  if (prompt.startsWith('Write a new 10-sentence grammar test')) {
    return Array.from({ length: 10 }, (_, i) => ({ sentence: 'He need ' + (i + 2) + ' more resistor for the board.', area: 'Articles and nouns' }));
  }
  if (prompt.startsWith('Below are 2-3 paragraphs')) {
    const a = prompt.indexOf('Text:\n"""\n') + 10, b = prompt.indexOf('\n"""', a);
    const sents = prompt.slice(a, b).replace(/\s+/g, ' ').split(/(?<=\.)\s+/);
    return { structure: 'Problem first, then the cause.', patterns: sents.slice(0, 3).map((m, i) => ({ model: m, pattern: '[Subject] + [verb] + [object] ' + i, grammar: 'present simple' })) };
  }
  return null;
}
if (typeof module !== 'undefined') module.exports = { phase0Answer };
