/**
 * Paste your Google Apps Script Web App URL here after deployment.
 * See google-apps-script/Code.gs for setup instructions.
 */
export const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL || '';

export const SHEETS = {
  EMPLOYEES: 'employees',
  CUSTOMERS:  'customers',
  SUPPLIERS:  'suppliers',
  PURCHASES:  'purchases',
  SALES:      'sales',
  EXPENSES:   'expenses',
  USERS:      'users',
} as const;
