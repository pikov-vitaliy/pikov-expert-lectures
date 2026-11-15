export const DISPLAY_DIGITS = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8, 9, 0]);

export function digitForClass(classId) {
  if (!Number.isInteger(classId) || classId < 0 || classId >= DISPLAY_DIGITS.length) {
    throw new RangeError('Output class must be an integer from 0 to 9');
  }
  return classId;
}

export function classForRow(row) {
  if (!Number.isInteger(row) || row < 0 || row >= DISPLAY_DIGITS.length) {
    throw new RangeError('Output row must be an integer from 0 to 9');
  }
  return DISPLAY_DIGITS[row];
}
