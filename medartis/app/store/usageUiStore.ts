import { create } from 'zustand';

type UsageUiState = {
  expandedCaseKey: string | null;
  setExpandedCaseKey: (key: string | null) => void;
};

export const useUsageUiStore = create<UsageUiState>((set) => ({
  expandedCaseKey: null,
  setExpandedCaseKey: (expandedCaseKey) => set({ expandedCaseKey }),
}));
