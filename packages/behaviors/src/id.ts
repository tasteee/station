let counter = 0;
/** Unique id for ARIA wiring inside shadow roots. */
export const uniqueId = (prefix = "st") => `${prefix}-${(++counter).toString(36)}`;
