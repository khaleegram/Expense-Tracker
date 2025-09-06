
import { createGenkitNextHandler } from '@genkit-ai/next';
import { ai } from '@/ai/genkit';
import '@/ai/flows/suggest-item-details';

export const POST = createGenkitNextHandler({
  getGenkit: () => ai,
});
