"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type WeightUnit = "kg" | "lb";

export const KG_TO_LB = 2.20462;

// kg → lb (1 decimal ထိ လှည့်)။
export function kgToLb(kg: number): number {
  return Math.round(kg * KG_TO_LB * 10) / 10;
}

// lb → kg (1 decimal ထိ လှည့်) — သိမ်းတဲ့အခါ kg ပြန်ပြောင်းတယ်။
export function lbToKg(lb: number): number {
  return Math.round((lb / KG_TO_LB) * 10) / 10;
}

// kg နဲ့ သိမ်းထားတဲ့ ဝိတ်ကို ပြမယ့် unit အတိုင်း ဂဏန်း ပြန်ပေးတယ်
// (1 decimal ထိ လှည့်)။
export function formatWeight(kg: number, unit: WeightUnit): number {
  return unit === "lb" ? kgToLb(kg) : Math.round(kg * 10) / 10;
}

export function getStoredWeightUnit(): WeightUnit {
  try {
    return localStorage.getItem("ct-weight-unit") === "lb" ? "lb" : "kg";
  } catch {
    return "kg";
  }
}

export function storeWeightUnit(unit: WeightUnit): void {
  try {
    localStorage.setItem("ct-weight-unit", unit);
  } catch {
    // သိမ်းမရရင် ဒီ session မှာပဲ ပြောင်းတယ်။
  }
}

const UnitContext = createContext<{
  unit: WeightUnit;
  setUnit: (unit: WeightUnit) => void;
}>({
  unit: "kg",
  setUnit: () => {},
});

export function UnitProvider({ children }: { children: ReactNode }) {
  const [unit, setUnitState] = useState<WeightUnit>("kg");
  // SSR မှာ localStorage မရှိဘူး — client မှာ mount ဖြစ်မှ ဖတ်တယ်။
  useEffect(() => {
    setUnitState(getStoredWeightUnit());
  }, []);
  const setUnit = useCallback((u: WeightUnit) => {
    setUnitState(u);
    storeWeightUnit(u);
  }, []);
  return (
    <UnitContext.Provider value={{ unit, setUnit }}>
      {children}
    </UnitContext.Provider>
  );
}

export function useWeightUnit(): {
  unit: WeightUnit;
  setUnit: (unit: WeightUnit) => void;
} {
  return useContext(UnitContext);
}
