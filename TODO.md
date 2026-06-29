# LingoPulse Accuracy Upgrade - TODO

- [ ] Implement engine router usage in `app.js` (use dropdown value)
- [ ] Add back-translation validation logic in `app.js` (meaning drift heuristic)
- [ ] Add glossary scaffolding (localStorage + prompt injection hooks)
- [x] Add Node backend scaffold (secure API key handling)
  - [x] POST /health
  - [ ] POST /translate (implement DeepL/OpenAI/Gemini calls)
  - [ ] POST /backtranslate (implement back-translation calls)
- [x] Wire frontend to backend for premium engines (DeepL/OpenAI/Gemini) [scaffolded; backend still needs provider integrations]


- [ ] Add retry/fallback policy based on drift score
- [ ] Manual test cases (idioms, polysemy, short phrases)

