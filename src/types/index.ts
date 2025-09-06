import { z } from 'zod';

export type Wife = 'Mama' | 'Maman Abba' | 'Maman Ummi' | 'N/A';

export const WIVES: Wife[] = ['Mama', 'Maman Abba', 'Maman Ummi'];
export const ALL_WIVES_OPTIONS: Wife[] = ['Mama', 'Maman Abba', 'Maman Ummi', 'N/A'];


export type Meal = 'Breakfast' | 'Lunch' | 'Dinner';

export const MEALS: Meal[] = ['Breakfast', 'Lunch', 'Dinner'];

export type ExpenseCategory = 'Breakfast' | 'Lunch' | 'Dinner' | 'Other';

export const EXPENSE_CATEGORIES: ExpenseCategory[] = ['Breakfast', 'Lunch', 'Dinner', 'Other'];

export interface Duty {
    wife: Wife;
    meals: Meal[];
}

export interface Expense {
  id: string;
  item: string;
  price: number;
  date: string; // YYYY-MM-DD
  wife: Wife;
  category: ExpenseCategory;
}

export interface ExpenseData extends Omit<Expense, 'id'> {}

export interface UniqueItem {
    id: string;
    name: string;
}

// Schema for past expenses, used in AI suggestions
const ExpenseSchema = z.object({
  id: z.string(),
  item: z.string(),
  price: z.number(),
  date: z.string(),
  wife: z.enum(['Mama', 'Maman Abba', 'Maman Ummi', 'N/A']),
  category: z.enum(['Breakfast', 'Lunch', 'Dinner', 'Other']),
});

// Input schema for the suggestItemDetails AI flow
export const SuggestItemDetailsInputSchema = z.object({
  itemName: z.string().describe('The name of the new item for which to suggest details.'),
  allExpenses: z.array(ExpenseSchema).describe('A list of all past expense records to provide context.'),
});
export type SuggestItemDetailsInput = z.infer<typeof SuggestItemDetailsInputSchema>;

// Output schema for the suggestItemDetails AI flow
export const SuggestItemDetailsOutputSchema = z.object({
  suggestedCategory: z.enum(EXPENSE_CATEGORIES).describe('The most likely category for the new item.'),
  suggestedPrice: z.number().describe('The average or most common price for similar items.'),
});
export type SuggestItemDetailsOutput = z.infer<typeof SuggestItemDetailsOutputSchema>;
