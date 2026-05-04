import { APPS_SCRIPT_URL } from './config';

type SheetName = 'employees' | 'customers' | 'suppliers' | 'purchases' | 'sales' | 'expenses' | 'users';
type Action = 'insert' | 'update' | 'delete' | 'upsert';

async function apiFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.data as T;
}

async function apiPost<T>(body: object): Promise<T> {
  const res = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json as T;
}

export async function fetchSheet<T>(sheet: SheetName): Promise<T[]> {
  const url = `${APPS_SCRIPT_URL}?sheet=${sheet}`;
  return apiFetch<T[]>(url);
}

export async function insertRecord<T extends { id: string }>(sheet: SheetName, data: T): Promise<void> {
  await apiPost({ action: 'insert' as Action, sheet, data });
}

export async function updateRecord<T extends { id: string }>(sheet: SheetName, data: T): Promise<void> {
  await apiPost({ action: 'update' as Action, sheet, data });
}

export async function deleteRecord(sheet: SheetName, id: string): Promise<void> {
  await apiPost({ action: 'delete' as Action, sheet, data: { id } });
}

export async function upsertRecord<T extends { id: string }>(sheet: SheetName, data: T): Promise<void> {
  await apiPost({ action: 'upsert' as Action, sheet, data });
}
