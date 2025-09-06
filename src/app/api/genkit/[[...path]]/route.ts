import { createGenkitNextHandler } from '@genkit-ai/next';
import {genkit} from 'genkit'

export const POST = createGenkitNextHandler({
    getGenkit: () => genkit,
});
