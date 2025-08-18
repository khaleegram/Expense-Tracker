import React from 'react';
import { cn } from '@/lib/utils';
import type { Wife } from '@/types';

const wifeStyles: Record<Wife, string> = {
  'Mama': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'Maman Abba': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  'Maman Ummi': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

export function WifeIcon({ wife, className }: { wife: Wife, className?: string }) {
  const initial = wife === "Mama" ? "M" : wife === "Maman Abba" ? "A" : "U";

  return (
    <div
      className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
        wifeStyles[wife],
        className
      )}
    >
      {initial}
    </div>
  );
}
