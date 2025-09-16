"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";

interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  placeholder?: string;
  disabled?: boolean;
  step?: number;
}

export function NumberInput({
  value,
  onChange,
  min = 0,
  max = 999,
  placeholder = "0",
  disabled = false,
  step = 1
}: NumberInputProps) {
  const [stringValue, setStringValue] = useState("");

  // Initialize string value from the number
  useEffect(() => {
    setStringValue(value > 0 ? value.toString() : "");
  }, [value]);

  const handleChange = (newValue: string) => {
    // Allow empty string
    if (newValue === "") {
      setStringValue("");
      onChange(0);
      return;
    }

    // Only allow valid numbers
    if (/^\d+$/.test(newValue)) {
      const numValue = parseInt(newValue);
      if (numValue >= min && numValue <= max) {
        setStringValue(newValue);
        onChange(numValue);
      }
    }
  };

  const handleBlur = () => {
    // If empty on blur, keep it empty (which represents 0)
    if (stringValue === "") {
      return;
    }

    // Ensure the value is within bounds
    const numValue = parseInt(stringValue);
    if (numValue < min) {
      setStringValue(min.toString());
      onChange(min);
    } else if (numValue > max) {
      setStringValue(max.toString());
      onChange(max);
    }
  };

  return (
    <Input
      type="text"
      value={stringValue}
      onChange={(e) => handleChange(e.target.value)}
      onBlur={handleBlur}
      placeholder={placeholder}
      disabled={disabled}
      className="text-center"
    />
  );
}