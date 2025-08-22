
import { Wife, Duty } from '@/types';
import { differenceInDays, startOfDay } from 'date-fns';

const START_DATE = startOfDay(new Date('2024-07-18T00:00:00'));

/**
 * Calculates the wife on duty for a given date based on a dynamic list of available wives.
 * @param date The date to check.
 * @param availableWives An array of wives who are currently available for duty.
 * @returns The primary wife on duty and the full duty list.
 */
export async function getWifeOnDutyForDate(date: Date, availableWives: Wife[]): Promise<{ primaryWife: Wife | null; duty: Duty[] }> {
  if (availableWives.length === 0) {
    return { primaryWife: null, duty: [] };
  }

  const targetDate = startOfDay(date);
  const dayDiff = differenceInDays(targetDate, START_DATE);

  // The logic now depends on the number of available wives.
  // The cycle length changes based on how many people are in the rotation.
  const numAvailable = availableWives.length;
  let primaryWife: Wife | null = null;
  const duties: Duty[] = [];

  if (numAvailable === 1) {
    // If only one wife is available, she does everything.
    primaryWife = availableWives[0];
    duties.push({ wife: primaryWife, meals: ['Breakfast', 'Lunch', 'Dinner'] });
  } else if (numAvailable === 2) {
    // A simple 2-day rotation for two wives.
    // Day 0: Wife A does BLD.
    // Day 1: Wife B does BLD.
    const cycleDay = (dayDiff % 2 + 2) % 2;
    primaryWife = availableWives[cycleDay];
    if (primaryWife) {
        duties.push({ wife: primaryWife, meals: ['Breakfast', 'Lunch', 'Dinner'] });
    }
  } else if (numAvailable === 3) {
    // This is the original 6-day cycle logic.
    const cycleDay = (dayDiff % 6 + 6) % 6; 
    
    // Map the role (A, B, C) to the currently available wives.
    const wifeA = availableWives[0];
    const wifeB = availableWives[1];
    const wifeC = availableWives[2];

    if (cycleDay === 0) { 
        duties.push({ wife: wifeC, meals: ['Breakfast', 'Lunch'] });
        duties.push({ wife: wifeA, meals: ['Dinner'] });
        primaryWife = wifeC;
    } else if (cycleDay === 1) { 
        duties.push({ wife: wifeA, meals: ['Breakfast', 'Lunch', 'Dinner'] });
        primaryWife = wifeA;
    } else if (cycleDay === 2) {
        duties.push({ wife: wifeA, meals: ['Breakfast', 'Lunch'] });
        duties.push({ wife: wifeB, meals: ['Dinner'] });
        primaryWife = wifeA;
    } else if (cycleDay === 3) {
        duties.push({ wife: wifeB, meals: ['Breakfast', 'Lunch', 'Dinner'] });
        primaryWife = wifeB;
    } else if (cycleDay === 4) {
        duties.push({ wife: wifeB, meals: ['Breakfast', 'Lunch'] });
        duties.push({ wife: wifeC, meals: ['Dinner'] });
        primaryWife = wifeB;
    } else if (cycleDay === 5) { 
        duties.push({ wife: wifeC, meals: ['Breakfast', 'Lunch', 'Dinner'] });
        primaryWife = wifeC;
    }
  }
  
  return { primaryWife, duty: duties };
}
