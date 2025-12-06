// src/components/recorder/StrategyIndicator.tsx
import React from "react";
import type { StrategyType } from "../../types/strategy";

interface StrategyIndicatorProps {
  strategy: StrategyType;
  confidence: number;
  className?: string;
}

const strategyColors: Record<StrategyType, string> = {
  dom_selector: "bg-blue-100 text-blue-800",
  css_selector: "bg-sky-100 text-sky-800",
  cdp_semantic: "bg-green-100 text-green-800",
  cdp_power: "bg-emerald-100 text-emerald-800",
  evidence_scoring: "bg-amber-100 text-amber-800",
  vision_ocr: "bg-purple-100 text-purple-800",
  coordinates: "bg-yellow-100 text-yellow-800"
};

const strategyLabels: Record<StrategyType, string> = {
  dom_selector: "DOM",
  css_selector: "CSS",
  cdp_semantic: "Semantic",
  cdp_power: "CDP",
  evidence_scoring: "Evidence",
  vision_ocr: "Vision",
  coordinates: "XY"
};

export function StrategyIndicator({ strategy, confidence, className = "" }: StrategyIndicatorProps) {
  const color = strategyColors[strategy] || "bg-gray-100 text-gray-800";
  const label = strategyLabels[strategy] || strategy;
  const pct = Math.round(confidence * 100);
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded ${color} ${className}`}>
      {label} ({pct}%)
    </span>
  );
}

export default StrategyIndicator;
