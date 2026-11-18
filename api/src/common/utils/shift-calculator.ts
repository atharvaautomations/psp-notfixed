export type Shift = 'SHIFT 1' | 'SHIFT 2';

/**
 * Calculate shift based on completion time.
 * SHIFT 1: 08:00:00 - 19:59:59
 * SHIFT 2: 20:00:00 - 07:59:59 (crosses midnight)
 */
export function calculateShift(date: Date): Shift {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();

  const totalMinutes = hours * 60 + minutes + seconds / 60;

  // SHIFT 1: 08:00 (480 min) to 19:59:59 (1199.98 min)
  // SHIFT 2: 20:00 (1200 min) to 07:59:59 (479.98 min) next day
  if (totalMinutes >= 480 && totalMinutes < 1200) {
    return 'SHIFT 1';
  }

  return 'SHIFT 2';
}

/**
 * Get shift display name
 */
export function getShiftDisplay(shift: Shift): string {
  return shift;
}