"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TimeInputProps {
  value: number; // total seconds
  onChange: (seconds: number) => void;
  placeholder?: string;
  maxMinutes?: number;
  disabled?: boolean;
}

export function TimeInput({
  value,
  onChange,
  placeholder = "0:00",
  maxMinutes = 10,
  disabled = false
}: TimeInputProps) {
  const [minutesStr, setMinutesStr] = useState("");
  const [secondsStr, setSecondsStr] = useState("");

  // Initialize string values from the total seconds
  useEffect(() => {
    const minutes = Math.floor(value / 60);
    const seconds = value % 60;
    setMinutesStr(minutes > 0 ? minutes.toString() : "");
    setSecondsStr(seconds > 0 ? seconds.toString() : "");
  }, [value]);

  const updateTotalSeconds = (newMinutesStr: string, newSecondsStr: string) => {
    const minutes = newMinutesStr === "" ? 0 : parseInt(newMinutesStr) || 0;
    const seconds = newSecondsStr === "" ? 0 : parseInt(newSecondsStr) || 0;

    // Ensure seconds don't exceed 59
    const normalizedSeconds = Math.min(seconds, 59);
    const totalSeconds = (minutes * 60) + normalizedSeconds;

    onChange(totalSeconds);
  };

  const handleMinutesChange = (newValue: string) => {
    // Allow empty string or valid numbers
    if (newValue === "" || (/^\d+$/.test(newValue) && parseInt(newValue) <= maxMinutes)) {
      setMinutesStr(newValue);
      updateTotalSeconds(newValue, secondsStr);
    }
  };

  const handleSecondsChange = (newValue: string) => {
    // Allow empty string or valid numbers up to 59
    if (newValue === "" || (/^\d+$/.test(newValue) && parseInt(newValue) <= 59)) {
      setSecondsStr(newValue);
      updateTotalSeconds(minutesStr, newValue);
    }
  };

  const handleMinutesBlur = () => {
    // If empty on blur, set to 0 but keep it as empty string for display
    if (minutesStr === "" && secondsStr === "") {
      // Both are empty, keep them empty
      return;
    }
  };

  const handleSecondsBlur = () => {
    // If empty on blur, set to 0 but keep it as empty string for display
    if (minutesStr === "" && secondsStr === "") {
      // Both are empty, keep them empty
      return;
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1">
        <Input
          type="text"
          value={minutesStr}
          onChange={(e) => handleMinutesChange(e.target.value)}
          onBlur={handleMinutesBlur}
          placeholder="0"
          disabled={disabled}
          className="text-center"
        />
        <Label className="text-xs text-muted-foreground mt-1 block text-center">
          minutes
        </Label>
      </div>
      <span className="text-lg font-medium self-start mt-2">:</span>
      <div className="flex-1">
        <Input
          type="text"
          value={secondsStr}
          onChange={(e) => handleSecondsChange(e.target.value)}
          onBlur={handleSecondsBlur}
          placeholder="00"
          disabled={disabled}
          className="text-center"
        />
        <Label className="text-xs text-muted-foreground mt-1 block text-center">
          seconds
        </Label>
      </div>
    </div>
  );
}