import { Wife, Duty, Meal } from '@/types';
import { differenceInDays, startOfDay } from 'date-fns';

const WIVES_ROTATION: Wife[] = ['Mama', 'Maman Abba', 'Maman Ummi'];
const START_DATE = startOfDay(new Date('2024-07-18T00:00:00'));

/**
 * Calculates the wife on duty for a given date based on a fixed rotation.
 * @param date The date to check.
 * @returns The primary wife on duty (responsible for lunch) and the full duty list.
 */
export function getWifeOnDutyForDate(date: Date): { primaryWife: Wife; duty: Duty[] } {
  const targetDate = startOfDay(date);
  const dayDiff = differenceInDays(targetDate, START_DATE);

  // This is a 6 day cycle based on the user's detailed description.
  // July 18 (diff 0): C(BL), A(D). Primary: C
  // July 19 (diff 1): A(BL), B(D). Primary: A
  // July 20 (diff 2): B(BLD). Primary: B
  // July 21 (diff 3): B(BL), C(D). Primary: B
  // July 22 (diff 4): C(BLD). Primary: C
  // July 23 (diff 5): C(BL), A(D). Primary: C -> This is a repeat of day 0. No, that's not right.

  // Let's re-evaluate the user's final logic.
  // "wife C did breakfast and lunch today 18th while Wife A is starting fresh today"
  // July 18: C(BL), A(D). Primary: C
  // "then tomorrow wife a does completely only her"
  // July 19: A(BLD). Primary: A
  // "then next tomorrow wife A does break fast and lunch then wife be do dinner"
  // July 20: A(BL), B(D). Primary: A
  // Following the pattern:
  // July 21: B(BLD). Primary: B
  // July 22: B(BL), C(D). Primary: B
  // July 23: C(BLD). Primary: C
  // July 24: C(BL), A(D). Primary: C -> This is a repeat of day 0 (July 18). So it IS a 6 day cycle.

  const cycleDay = (dayDiff % 6 + 6) % 6; // Ensure positive modulo

  const duties: Duty[] = [];
  let primaryWife: Wife = 'Mama';

  if (cycleDay === 0) { // e.g., July 18, July 24
    duties.push({ wife: 'Maman Ummi', meals: ['Breakfast', 'Lunch'] });
    duties.push({ wife: 'Mama', meals: ['Dinner'] });
    primaryWife = 'Maman Ummi';
  } else if (cycleDay === 1) { // e.g., July 19
    duties.push({ wife: 'Mama', meals: ['Breakfast', 'Lunch', 'Dinner'] });
    primaryWife = 'Mama';
  } else if (cycleDay === 2) { // e.g., July 20
    duties.push({ wife: 'Mama', meals: ['Breakfast', 'Lunch'] });
    duties.push({ wife: 'Maman Abba', meals: ['Dinner'] });
    primaryWife = 'Mama';
  } else if (cycleDay === 3) { // e.g., July 21
    duties.push({ wife: 'Maman Abba', meals: ['Breakfast', 'Lunch', 'Dinner'] });
    primaryWife = 'Maman Abba';
  } else if (cycleDay === 4) { // e.g., July 22
    duties.push({ wife: 'Maman Abba', meals: ['Breakfast', 'Lunch'] });
    duties.push({ wife: 'Maman Ummi', meals: ['Dinner'] });
    primaryWife = 'Maman Abba';
  } else if (cycleDay === 5) { // e.g., July 23
    duties.push({ wife: 'Maman Ummi', meals: ['Breakfast', 'Lunch', 'Dinner'] });
    primaryWife = 'Maman Ummi';
  }
  
  return { primaryWife, duty: duties };
}
