
import { Wife, Duty } from '@/types';
import { differenceInDays, startOfDay } from 'date-fns';

// This start date is arbitrary and serves as a fixed point for calculation.
// Changing it would change the rotation for all past and future dates.
const START_DATE = startOfDay(new Date('2024-01-01'));

/**
 * Calculates the wife on duty for a given date based on a dynamic list of available wives
 * using a simple round-robin rotation.
 * @param date The date to check.
 * @param availableWives An array of wives who are currently available for duty, in order.
 * @returns The primary wife on duty and the full duty list.
 */
export async function getWifeOnDutyForDate(date: Date, availableWives: Wife[]): Promise<{ primaryWife: Wife | null; duty: Duty[] }> {
  const numAvailable = availableWives.length;
  if (numAvailable === 0) {
    return { primaryWife: null, duty: [] };
  }

  const targetDate = startOfDay(date);
  const dayDiff = differenceInDays(targetDate, START_DATE);

  // Simple round-robin: The index is the day difference modulo the number of available wives.
  // This ensures a fair rotation through the wives present in the `availableWives` array.
  const dutyIndex = (dayDiff % numAvailable + numAvailable) % numAvailable;
  const primaryWife = availableWives[dutyIndex];
  
  const duties: Duty[] = [];

  if (primaryWife && primaryWife !== 'N/A') {
    duties.push({ wife: primaryWife, meals: ['Breakfast', 'Lunch', 'Dinner'] });
  }
  
  return { primaryWife, duty: duties };
}

    