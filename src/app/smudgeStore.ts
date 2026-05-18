import { create } from 'zustand';

export type SmudgeState = {
  strength: number;
  softness: number;
  amount: number;
  spacing: number;
  setStrength: (strength: number) => void;
  setSoftness: (softness: number) => void;
  setAmount: (amount: number) => void;
  setSpacing: (spacing: number) => void;
};

export const useSmudgeStore = create<SmudgeState>((set) => ({
  strength: 0.72,
  softness: 0.68,
  amount: 0.82,
  spacing: 0.18,
  setStrength: (strength) => set({ strength }),
  setSoftness: (softness) => set({ softness }),
  setAmount: (amount) => set({ amount }),
  setSpacing: (spacing) => set({ spacing }),
}));
