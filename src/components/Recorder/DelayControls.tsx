// src/components/recorder/DelayControls.tsx
import React from "react";

interface DelayControlsProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
  className?: string;
}

export function DelayControls({ value, onChange, min = 0, max = 10000, label = "Delay", className = "" }: DelayControlsProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value, 10);
    if (!isNaN(newValue) && newValue >= min && newValue <= max) {
      onChange(newValue);
    }
  };
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <label className="text-sm font-medium text-gray-700">{label}:</label>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={handleChange}
        className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <span className="text-sm text-gray-500">ms</span>
      <input
        type="range"
        min={min}
        max={max}
        step={100}
        value={value}
        onChange={handleChange}
        className="w-24 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
      />
    </div>
  );
}

export default DelayControls;
