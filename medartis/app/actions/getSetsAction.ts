// app/actions/getSetsAction.ts
'use server';

import { getSets } from '../lib/google-sheets';
import { Sets } from '../types/interfaces';

export async function fetchLiveSets(): Promise<{ success: boolean; data: Sets[]; error?: string }> {
  try {
    const data = await getSets();
    return { success: true, data };
  } catch (err: any) {
    return { success: false, data: [], error: err.message };
  }
}