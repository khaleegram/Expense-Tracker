
'use server';
/**
 * @fileOverview An AI flow to suggest details for a new expense item.
 *
 * - suggestItemDetails: A function that suggests a category and price for a new item.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { 
  SuggestItemDetailsInputSchema, 
  SuggestItemDetailsOutputSchema,
  SuggestItemDetailsInput,
  SuggestItemDetailsOutput
} from '@/types';


// Define the main exported function that clients will call.
export async function suggestItemDetails(input: SuggestItemDetailsInput): Promise<SuggestItemDetailsOutput> {
  return suggestItemDetailsFlow(input);
}

// Define the AI prompt for the suggestion task.
const suggestDetailsPrompt = ai.definePrompt({
  name: 'suggestDetailsPrompt',
  input: { schema: SuggestItemDetailsInputSchema },
  output: { schema: SuggestItemDetailsOutputSchema },
  prompt: `
    You are an intelligent expense-tracking assistant. A user is adding a new expense item named '{{itemName}}'.
    Your task is to suggest a suitable category and price for this item based on past expenses.

    Analyze the list of all past expenses provided below. Find expenses for items with similar names to '{{itemName}}'.

    Based on these similar items, determine the most common category they belong to.
    Then, calculate a reasonable average price for these items.

    If you cannot find any similar items, make a logical guess. For example, 'Bread' is likely for 'Breakfast' and a common grocery item price.
    
    Here is the list of all past expenses:
    {{#each allExpenses}}
    - Item: {{item}}, Price: {{price}}, Category: {{category}}, Date: {{date}}
    {{/each}}

    Provide your suggestion in the specified JSON format.
  `,
});

// Define the Genkit flow that orchestrates the AI call.
const suggestItemDetailsFlow = ai.defineFlow(
  {
    name: 'suggestItemDetailsFlow',
    inputSchema: SuggestItemDetailsInputSchema,
    outputSchema: SuggestItemDetailsOutputSchema,
  },
  async (input) => {
    // If there are no past expenses, we can't make a suggestion.
    if (input.allExpenses.length === 0) {
      // You might want to return a default or throw an error.
      // For now, let's try a guess without context.
      const { output } = await suggestDetailsPrompt({ itemName: input.itemName, allExpenses: [] });
      return output!;
    }
    
    const { output } = await suggestDetailsPrompt(input);
    return output!;
  }
);
