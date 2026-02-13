import { useState, useCallback } from "react";

type Unit = "seconds" | "minutes";

interface DurationInputProps {
  id: string;
  label: string;
  hint: string;
  /** Value in seconds */
  value: number;
  /** Called with value in seconds */
  onChange: (seconds: number) => void;
  /** Min value in seconds */
  minSeconds: number;
  /** Max value in seconds */
  maxSeconds: number;
  secondsLabel: string;
  minutesLabel: string;
}

function inferUnit(seconds: number): Unit {
  return seconds >= 60 && seconds % 60 === 0 ? "minutes" : "seconds";
}

function toDisplay(seconds: number, unit: Unit): number {
  return unit === "minutes" ? seconds / 60 : seconds;
}

function toSeconds(display: number, unit: Unit): number {
  return unit === "minutes" ? display * 60 : display;
}

export function DurationInput({
  id,
  label,
  hint,
  value,
  onChange,
  minSeconds,
  maxSeconds,
  secondsLabel,
  minutesLabel,
}: DurationInputProps) {
  const [unit, setUnit] = useState<Unit>(() => inferUnit(value));

  const displayValue = toDisplay(value, unit);

  const minDisplay =
    unit === "minutes" ? Math.ceil(minSeconds / 60) : minSeconds;
  const maxDisplay =
    unit === "minutes" ? Math.floor(maxSeconds / 60) : maxSeconds;

  const handleValueChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const num = Number(e.target.value);
      if (!isNaN(num)) {
        const seconds = toSeconds(num, unit);
        onChange(seconds);
      }
    },
    [unit, onChange],
  );

  const handleUnitChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newUnit = e.target.value as Unit;
      setUnit(newUnit);
      // Convert current value to new unit, clamping to valid range
      const currentSeconds = value;
      let newSeconds = currentSeconds;
      if (newUnit === "minutes") {
        // Round to nearest minute
        newSeconds = Math.round(currentSeconds / 60) * 60;
        if (newSeconds < minSeconds)
          newSeconds = Math.ceil(minSeconds / 60) * 60;
        if (newSeconds > maxSeconds)
          newSeconds = Math.floor(maxSeconds / 60) * 60;
      }
      // Clamp
      newSeconds = Math.max(minSeconds, Math.min(maxSeconds, newSeconds));
      onChange(newSeconds);
    },
    [value, minSeconds, maxSeconds, onChange],
  );

  return (
    <div className="form-control min-w-0">
      <label className="label" htmlFor={id}>
        <span className="label-text font-medium">{label}</span>
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          type="number"
          min={minDisplay}
          max={maxDisplay}
          step="1"
          value={displayValue}
          onChange={handleValueChange}
          className="input input-bordered flex-1 min-w-0 bg-base-100 focus:bg-base-100 transition-colors"
        />
        <select
          value={unit}
          onChange={handleUnitChange}
          className="select select-bordered bg-base-100 w-auto"
        >
          <option value="seconds">{secondsLabel}</option>
          <option value="minutes">{minutesLabel}</option>
        </select>
      </div>
      <p className="text-xs text-base-content/60 mt-1 px-1">{hint}</p>
    </div>
  );
}
