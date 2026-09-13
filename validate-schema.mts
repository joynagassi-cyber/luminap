import { AppSchema } from './src/lib/powersync/schema.ts';
try { AppSchema.validate(); console.log('SCHEMA VALID — no throw'); } catch(e) { console.log('SCHEMA THROWS:', (e as Error).message); }
