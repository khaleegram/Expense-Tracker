
'use server';
/**
 * @fileOverview An AI flow to suggest details for an expense item.
 *
 * - suggestItemDetails - A function that suggests a category and price for a given item.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { SuggestionInput, SuggestionOutput } from '@/types';
import { SuggestionInputSchema, SuggestionOutputSchema } from '@/types';

export async function suggestItemDetails(input: SuggestionInput): Promise<SuggestionOutput> {
  if (input.allExpenses.length === 0) {
    console.log("No existing expenses, skipping AI suggestion.");
    return { category: null, price: null };
  }
  return suggestItemDetailsFlow(input);
}

const suggestDetailsPrompt = ai.definePrompt({
  name: 'suggestDetailsPrompt',
  input: { schema: SuggestionInputSchema },
  output: { schema: SuggestionOutputSchema },
  prompt: `You are an assistant helping a user manage their household expenses.
The user is adding a new expense and you need to suggest a category and a price based on their past spending habits.

Here is the name of the new item:
'{{itemName}}'

Here is the list of all their past expenses in JSON format:
{{{json allExpenses}}}

Analyze the list of past expenses. Find other times the user purchased '{{itemName}}' or similar items.
Based on the history, suggest a likely 'category' for this item. The available categories are "Breakfast", "Lunch", "Dinner", and "Other".
Also, suggest a likely 'price' for this item based on the average or most recent price paid for it.

If you cannot find any relevant history for the item, you can return null for either or both fields.
Return your suggestions in a valid JSON object format.
`,
});

const suggestItemDetailsFlow = ai.defineFlow(
  {
    name: 'suggestItemDetailsFlow',
    inputSchema: SuggestionInputSchema,
    outputSchema: SuggestionOutputSchema,
  },
  async (input) => {
    if (input.allExpenses.length === 0) {
      return { category: null, price: null };
    }
    
    const { output } = await suggestDetailsPrompt(input);
    return output!;
  }
);
