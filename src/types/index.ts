export type Wife = 'Wife A' | 'Wife B' | 'Wife C';

export const WIVES: Wife[] = ['Wife A', 'Wife B', 'Wife C'];

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
