'use server';

/**
 * @fileOverview Provides AI-powered suggestions for wife assignment based on the date and a complex meal-based rotation.
 *
 * - suggestWifeAssignment - A function that suggests the wife and meal assignment for a given date.
 * - WifeAssignmentSuggestionInput - The input type for the suggestWifeAssignment function.
 * - WifeAssignmentSuggestionOutput - The return type for the suggestWifeAssignment function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { differenceInDays, parseISO } from 'date-fns';

const WifeAssignmentSuggestionInputSchema = z.object({
  date: z.string().describe('The date for which to suggest a wife assignment (YYYY-MM-DD).'),
});
export type WifeAssignmentSuggestionInput = z.infer<typeof WifeAssignmentSuggestionInputSchema>;

const WifeAssignmentSuggestionOutputSchema = z.object({
  duty: z.array(z.object({
    wife: z.string().describe('The name of the wife on duty.'),
    meals: z.array(z.string()).describe('A list of meals the wife is responsible for on this date.'),
  })).describe('A list of wives on duty for the given date and their assigned meals.'),
  primaryWife: z.string().describe('The primary wife for the day, usually the one with the most meals.'),
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
  prompt: `You are a helpful assistant that determines which wife is on duty for a given date based on a complex, meal-based rotation.

The schedule is a 3-day cycle for each wife:
- A wife's turn starts with **Dinner** on her first day.
- On her second day, she covers **Breakfast, Lunch, and Dinner**.
- On her third and final day, she covers **Breakfast and Lunch**.
- The next wife in the rotation starts with **Dinner** on that same third day.

The rotation order is Wife A -> Wife B -> Wife C -> Wife A, and so on.

The cycle starts with Wife A on **2024-07-29**.
- 2024-07-29: Wife A (Dinner)
- 2024-07-30: Wife A (Breakfast, Lunch, Dinner)
- 2024-07-31: Wife A (Breakfast, Lunch), Wife B (Dinner)
- 2024-08-01: Wife B (Breakfast, Lunch, Dinner)
...and so on.

Given the date {{{date}}}, determine which wife (or wives) are on duty and which meals they are responsible for. The 'primaryWife' should be the one responsible for lunch on the given day.

Today's Date: {{{date}}}.`,
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
