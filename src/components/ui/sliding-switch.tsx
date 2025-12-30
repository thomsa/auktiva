"use client";

import { useState, useEffect } from "react";

interface SlidingSwitchProps {
  leftLabel: string;
  rightLabel: string;
  leftValue: string;
  rightValue: string;
  value: string;
  onChange: (value: string) => void;
  leftColor?: string;
  rightColor?: string;
  activeTextColor?: string;
  inactiveTextColor?: string;
  className?: string;
}

export function SlidingSwitch({
  leftLabel,
  rightLabel,
  leftValue,
  rightValue,
  value,
  onChange,
  leftColor = "bg-success",
  rightColor = "bg-error",
  activeTextColor = "text-white",
  inactiveTextColor = "text-base-content/60",
  className = "",
}: SlidingSwitchProps) {
  const [isRight, setIsRight] = useState(value === rightValue);

  useEffect(() => {
    setIsRight(value === rightValue);
  }, [value, rightValue]);

  const handleClick = (clickedRight: boolean) => {
    setIsRight(clickedRight);
    onChange(clickedRight ? rightValue : leftValue);
  };

  return (
    <div
      className={`relative flex w-full rounded-xl bg-base-200 p-1 ${className}`}
    >
      {/* Sliding background */}
      <div
        className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg transition-all duration-300 ease-out shadow-md ${
          isRight ? `${rightColor} left-[calc(50%+2px)]` : `${leftColor} left-1`
        }`}
      />

      {/* Left button */}
      <button
        type="button"
        onClick={() => handleClick(false)}
        className={`relative z-10 flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm transition-colors duration-300 ${
          !isRight ? activeTextColor : inactiveTextColor
        }`}
      >
        {leftLabel}
      </button>

      {/* Right button */}
      <button
        type="button"
        onClick={() => handleClick(true)}
        className={`relative z-10 flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm transition-colors duration-300 ${
          isRight ? activeTextColor : inactiveTextColor
        }`}
      >
        {rightLabel}
      </button>
    </div>
  );
}
