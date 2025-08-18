import { Wife, Duty, Meal } from '@/types';
import { differenceInDays, startOfDay } from 'date-fns';

const WIVES_ROTATION: Wife[] = ['Wife A', 'Wife B', 'Wife C'];
const START_DATE = startOfDay(new Date('2024-07-18T00:00:00'));

/**
 * Calculates the wife on duty for a given date based on a fixed rotation.
 * @param date The date to check.
 * @returns The primary wife on duty (responsible for lunch) and the full duty list.
 */
export function getWifeOnDutyForDate(date: Date): { primaryWife: Wife; duty: Duty[] } {
  const targetDate = startOfDay(date);
  const dayDiff = differenceInDays(targetDate, START_DATE);

  // The cycle repeats every 3 days for each wife, but the overall pattern repeats over 9 days.
  // We use modulo to find where in the 9-day cycle we are.
  // day 0: C(B,L), A(D) -> offset for A is 0, offset for C is 2.
  // To simplify, let's calculate based on Wife A's cycle starting fresh on July 19th.
  // Let's use a reference date where a cycle cleanly starts.
  // July 18: C(BL), A(D)
  // July 19: A(BLD) -> This is Day 2 of A's turn.
  // July 20: A(BL), B(D) -> This is Day 3 of A's turn.
  // A full rotation of A,B,C takes 3 * 2 = 6 full days + 3 dinner days = 9 days?
  // Day 1: A(D)
  // Day 2: A(BLD)
  // Day 3: A(BL), B(D)
  // Day 4: B(BLD)
  // Day 5: B(BL), C(D)
  // Day 6: C(BLD)
  // Day 7: C(BL), A(D)
  // This is a 6 day cycle. Let's use that.
  // July 18 is a reference. Day diff from July 18.
  // July 18 (diff 0): C(BL), A(D). Primary: C
  // July 19 (diff 1): A(BLD). Primary: A
  // July 20 (diff 2): A(BL), B(D). Primary: A
  // July 21 (diff 3): B(BLD). Primary: B
  // July 22 (diff 4): B(BL), C(D). Primary: B
  // July 23 (diff 5): C(BLD). Primary: C
  // July 24 (diff 6): C(BL), A(D). Primary: C -> This is a repeat of day 0. So it is a 6 day cycle.

  const cycleDay = (dayDiff % 6 + 6) % 6; // Ensure positive modulo

  const duties: Duty[] = [];
  let primaryWife: Wife = 'Wife A';

  if (cycleDay === 0) { // e.g., July 18, July 24
    duties.push({ wife: 'Wife C', meals: ['Breakfast', 'Lunch'] });
    duties.push({ wife: 'Wife A', meals: ['Dinner'] });
    primaryWife = 'Wife C';
  } else if (cycleDay === 1) { // e.g., July 19
    duties.push({ wife: 'Wife A', meals: ['Breakfast', 'Lunch', 'Dinner'] });
    primaryWife = 'Wife A';
  } else if (cycleDay === 2) { // e.g., July 20
    duties.push({ wife: 'Wife A', meals: ['Breakfast', 'Lunch'] });
    duties.push({ wife: 'Wife B', meals: ['Dinner'] });
    primaryWife = 'Wife A';
  } else if (cycleDay === 3) { // e.g., July 21
    duties.push({ wife: 'Wife B', meals: ['Breakfast', 'Lunch', 'Dinner'] });
    primaryWife = 'Wife B';
  } else if (cycleDay === 4) { // e.g., July 22
    duties.push({ wife: 'Wife B', meals: ['Breakfast', 'Lunch'] });
    duties.push({ wife: 'Wife C', meals: ['Dinner'] });
    primaryWife = 'Wife B';
  } else if (cycleDay === 5) { // e.g., July 23
    duties.push({ wife: 'Wife C', meals: ['Breakfast', 'Lunch', 'Dinner'] });
    primaryWife = 'Wife C';
  }
  
  return { primaryWife, duty: duties };
}
