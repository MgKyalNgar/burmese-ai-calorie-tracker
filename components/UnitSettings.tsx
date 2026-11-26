"use client";

import { useState } from "react";
import { useLang } from "@/lib/i18n";
import { useWeightUnit, type WeightUnit } from "@/lib/units";

// ဝိတ်ယူနစ် ရွေးတာ — kg / lb။
// သိမ်းတာ kg နဲ့ပဲ — ပြတာပဲ ပြောင်းတယ်။
const UNITS: WeightUnit[] = ["kg", "lb"];

export default function UnitSettings() {
  const { t } = useLang();
  const { unit, setUnit } = useWeightUnit();
  // ပုံမှန် ပိတ်ထား — ခေါင်းစဉ်ကိုနှိပ်မှ ဖွင့်တယ်။
  const [open, setOpen] = useState(false);

  return (
    <section className="mt-3 rounded-2xl bg-white shadow-sm p-4">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="text-[18px] font-bold leading-[1.3]">
          {t("unit.title")}
        </span>
        <span className="caption shrink-0">
          {unit}
          {open ? " ▴" : " ▾"}
        </span>
      </button>

      {open && (
        <div className="anim-in">
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="caption">{t("unit.weight")}</span>
            <div className="flex rounded-full bg-slate-100 p-0.5">
              {UNITS.map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUnit(u)}
                  className={`rounded-full px-2.5 py-1 text-[13px] font-semibold ${
                    unit === u
                      ? "bg-white text-[var(--theme-dark)] shadow-sm"
                      : "text-[#52677f]"
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>

          <p className="caption mt-2">{t("unit.note")}</p>
        </div>
      )}
    </section>
  );
}
