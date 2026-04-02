export const QUEUE_NAMES = {
  IMPORTS: 'imports',
  PAYROLL: 'payroll',
  DEAD_LETTER: 'dead-letter',
} as const;

export const QUEUE_JOBS = {
  IMPORT_EMPLOYEES: 'imports.employees',
  IMPORT_PRODUCTS: 'imports.products',
  PAYROLL_CALCULATE: 'payroll.calculate',
  DEAD_LETTER: 'dead-letter.record',
} as const;
