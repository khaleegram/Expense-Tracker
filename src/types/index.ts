export type Wife = 'Wife A' | 'Wife B' | 'Wife C';

export const WIVES: Wife[] = ['Wife A', 'Wife B', 'Wife C'];

export type Meal = 'Breakfast' | 'Lunch' | 'Dinner';

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
}

export interface ExpenseData extends Omit<Expense, 'id'> {}

export interface UniqueItem {
    id: string;
    name: string;
}
