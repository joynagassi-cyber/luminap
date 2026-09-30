import { type MagnitudeConfig } from 'magnitude-test';

// Learn more about configuring Magnitude:
// https://docs.magnitude.run/customizing/configuration
//
// Le client LLM (Agnes 3.0 Flash, endpoint OpenAI-compatible) est défini ICI
// (uniquement au niveau config globale : l'option `llm` d'un test individuel
// n'est pas relayée par le runner de magnitude-test@0.3.13 — vérifié dans
// dist/cli.mjs, seule `this.config.llm` est transmise). Les valeurs viennent
// de l'environnement (AGNES_API_KEY posée par e2e-min/run-magnitude.ps1) et
// ne sont JAMAIS écrites dans un fichier.

export default {
  url: "http://localhost:8080",
  llm: {
    provider: 'openai-generic',
    options: {
      baseUrl: process.env.AGNES_BASE_URL ?? 'https://apihub.agnes-ai.com/v1',
      apiKey: process.env.AGNES_API_KEY ?? '',
      model: process.env.AGNES_MODEL ?? 'agnes-3.0-flash',
      temperature: 0.2,
    },
  },
} satisfies MagnitudeConfig;
