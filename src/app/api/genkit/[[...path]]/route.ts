
import { createGenkitNextHandler } from '@genkit-ai/next';
import { ai } from '@/ai/genkit';

export const POST = createGenkitNextHandler({
  getGenkit: () => ai,
});
