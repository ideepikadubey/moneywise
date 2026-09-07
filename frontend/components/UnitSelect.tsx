"use client";

import { useState, useEffect } from "react";
import { UNITS_LIST, UnitOption } from "@/lib/units";

interface UnitSelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  id?: string;
  compact?: boolean;
}

const CATEGORIES: UnitOption["category"][] = [
  "Packaging",
  "Quantity",
  "Weight",
  "Volume",
  "Length & Area",
  "Time & Service",
  "Other",
];

export default function UnitSelect({
  value,
  onChange,
  className = "",
  id,
  compact = false,
}: UnitSelectProps) {
  const isStandardCode = UNITS_LIST.some(
    (u) => u.code === (value || "").toUpperCase() && u.code !== "OTH"
  );

  const [isCustomMode, setIsCustomMode] = useState<boolean>(!isStandardCode && value !== "");
  const [customValue, setCustomValue] = useState<string>(!isStandardCode ? value : "");

  useEffect(() => {
    const isPreset = UNITS_LIST.some(
      (u) => u.code === (value || "").toUpperCase() && u.code !== "OTH"
    );
    if (!isPreset && value) {
      setIsCustomMode(true);
      setCustomValue(value);
    } else if (isPreset) {
      setIsCustomMode(false);
    }
  }, [value]);

  function handleSelectChange(val: string) {
    if (val === "OTH") {
      setIsCustomMode(true);
      onChange(customValue || "OTH");
    } else {
      setIsCustomMode(false);
      onChange(val);
    }
  }

  function handleCustomInputChange(val: string) {
    const upper = val.toUpperCase();
    setCustomValue(upper);
    onChange(upper);
  }

  const selectValue = isCustomMode ? "OTH" : value.toUpperCase() || "PCS";

  return (
    <div className={`space-y-1.5 ${className}`}>
      <select
        id={id}
        value={selectValue}
        onChange={(e) => handleSelectChange(e.target.value)}
        className={`w-full rounded-lg border border-slate-300 bg-white text-slate-800 focus:border-indigo-500 focus:outline-none ${
          compact ? "px-2 py-1 text-xs" : "px-3 py-2 text-sm"
        }`}
      >
        {CATEGORIES.map((cat) => {
          const unitsInCat = UNITS_LIST.filter((u) => u.category === cat);
          if (unitsInCat.length === 0) return null;
          return (
            <optgroup key={cat} label={cat}>
              {unitsInCat.map((u) => (
                <option key={u.code} value={u.code}>
                  {u.name}
                </option>
              ))}
            </optgroup>
          );
        })}
      </select>

      {isCustomMode && (
        <input
          type="text"
          placeholder="Enter custom unit (e.g. CARROT, PKT)"
          value={customValue}
          onChange={(e) => handleCustomInputChange(e.target.value)}
          className={`w-full rounded-lg border border-indigo-300 bg-indigo-50/50 text-indigo-950 uppercase placeholder:normal-case focus:border-indigo-500 focus:outline-none ${
            compact ? "px-2 py-1 text-xs" : "px-3 py-2 text-sm"
          }`}
        />
      )}
    </div>
  );
}
