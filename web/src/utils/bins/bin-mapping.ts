/**
 * Frontend-only bin name mapping.
 * Translates backend bin identifiers (B1-B50) into display-friendly names.
 * Backend bin names are preserved when submitting data to the API.
 *
 * Mapping:
 *   B1-B28  → B1-B28 (unchanged)
 *   B29     → OIL1
 *   B30     → OIL2
 *   B31     → OIL3
 *   B32     → C1
 *   B33     → C2
 *   B34     → C3
 *   B35     → NR1  (was NK1)
 *   B36     → NR2  (was NK2)
 *   B37-B51 → SR1-SR15  (was SK1-SK15)
 *
 * The backend currently defines B1-B50, so B51 is only mapped for
 * forward compatibility and is never created by the frontend.
 */

const BACKEND_TO_DISPLAY: Record<string, string> = {};

// B1-B28 keep their backend name (no entry needed; fallback returns it as-is).

// B29-B31 → OIL1-OIL3
BACKEND_TO_DISPLAY['B29'] = 'OIL1';
BACKEND_TO_DISPLAY['B30'] = 'OIL2';
BACKEND_TO_DISPLAY['B31'] = 'OIL3';

// B32-B34 → C1-C3
BACKEND_TO_DISPLAY['B32'] = 'C1';
BACKEND_TO_DISPLAY['B33'] = 'C2';
BACKEND_TO_DISPLAY['B34'] = 'C3';

// B35-B36 → NR1-NR2 (corrected from NK1-NK2)
BACKEND_TO_DISPLAY['B35'] = 'NR1';
BACKEND_TO_DISPLAY['B36'] = 'NR2';

// B37-B51 → SR1-SR15 (corrected from SK1-SK15)
for (let i = 37; i <= 51; i++) {
  BACKEND_TO_DISPLAY[`B${i}`] = `SR${i - 36}`;
}

// Reverse map: display name → backend name
const DISPLAY_TO_BACKEND: Record<string, string> = {};
Object.entries(BACKEND_TO_DISPLAY).forEach(([backend, display]) => {
  DISPLAY_TO_BACKEND[display] = backend;
});

/**
 * Convert a backend bin number to its frontend display name.
 * Falls back to the original backend name if no mapping exists.
 */
export function binToDisplay(binNumber: string): string {
  return BACKEND_TO_DISPLAY[binNumber] ?? binNumber;
}

/**
 * Convert a frontend display bin name back to the backend bin number.
 * Falls back to the input if no reverse mapping exists.
 */
export function binToBackend(displayName: string): string {
  return DISPLAY_TO_BACKEND[displayName] ?? displayName;
}

/**
 * Get all backend bin numbers (B1-B50 as defined by the backend service).
 */
export function getAllBackendBins(): string[] {
  return Array.from({ length: 50 }, (_, i) => `B${i + 1}`);
}

/**
 * Get all backend bin numbers with their display names.
 */
export function getAllBackendBinsWithDisplay(): Array<{
  backend: string;
  display: string;
}> {
  return getAllBackendBins().map((backend) => ({
    backend,
    display: binToDisplay(backend),
  }));
}
