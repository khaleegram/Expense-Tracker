
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

export const SuggestionInputSchema = z.object({
  itemName: z.string().describe("The name of the new item being added."),
  allExpenses: z.array(z.object({
    id: z.string(),
    item: z.string(),
    price: z.number(),
    date: z.string(),
    wife: z.string(),
    category: z.string(),
  })).describe("An array of all past expense objects to provide historical context."),
});
export type SuggestionInput = z.infer<typeof SuggestionInputSchema>;


export const SuggestionOutputSchema = z.object({
  category: z.nativeEnum(EXPENSE_CATEGORIES).nullable().describe("The suggested category for the item."),
  price: z.number().nullable().describe("The suggested price for the item."),
});
export type SuggestionOutput = z.infer<typeof SuggestionOutputSchema>;
