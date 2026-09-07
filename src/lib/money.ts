/**
 * Money is stored everywhere as an integer number of minor units (قروش),
 * so no floating point ever touches a balance.
 */
export const MINOR_PER_MAJOR = 100;

export function toMinor(major: number): number {
  return Math.round(major * MINOR_PER_MAJOR);
}

export function toMajor(minor: number): number {
  return minor / MINOR_PER_MAJOR;
}

/** Parses free-form keypad input ("١٢٣٫٥٠", "123.5") into minor units. */
export function parseAmount(input: string): number {
  const normalised = input
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٫،,]/g, '.')
    .replace(/[^\d.]/g, '');
  const value = Number.parseFloat(normalised);
  return Number.isFinite(value) ? toMinor(value) : 0;
}
