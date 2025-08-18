'use server';

/**
 * @fileOverview Provides AI-powered suggestions for wife assignment based on the date.
 *
 * - suggestWifeAssignment - A function that suggests the wife assignment for a given date.
 * - WifeAssignmentSuggestionInput - The input type for the suggestWifeAssignment function.
 * - WifeAssignmentSuggestionOutput - The return type for the suggestWifeAssignment function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const WifeAssignmentSuggestionInputSchema = z.object({
  date: z.string().describe('The date for which to suggest a wife assignment (YYYY-MM-DD).'),
});
export type WifeAssignmentSuggestionInput = z.infer<typeof WifeAssignmentSuggestionInputSchema>;

const WifeAssignmentSuggestionOutputSchema = z.object({
  suggestedWife: z
    .string()
    .describe('The suggested wife for the given date (Wife A, Wife B, or Wife C).'),
});
export type WifeAssignmentSuggestionOutput = z.infer<typeof WifeAssignmentSuggestionOutputSchema>;

export async function suggestWifeAssignment(
  input: WifeAssignmentSuggestionInput
): Promise<WifeAssignmentSuggestionOutput> {
  return wifeAssignmentSuggestionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'wifeAssignmentSuggestionPrompt',
  input: {schema: WifeAssignmentSuggestionInputSchema},
  output: {schema: WifeAssignmentSuggestionOutputSchema},
  prompt: `You are a helpful assistant that suggests which wife should be assigned to a particular date based on a pre-defined schedule.

The schedule is as follows:
- Wife A: Monday, Thursday
- Wife B: Tuesday, Friday
- Wife C: Wednesday, Saturday, Sunday

Given the date {{{date}}}, suggest which wife should be assigned. Return only the wife's name (Wife A, Wife B, or Wife C).`,
});

const wifeAssignmentSuggestionFlow = ai.defineFlow(
  {
    name: 'wifeAssignmentSuggestionFlow',
    inputSchema: WifeAssignmentSuggestionInputSchema,
    outputSchema: WifeAssignmentSuggestionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
