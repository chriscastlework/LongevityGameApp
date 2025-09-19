"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";

interface NumberInputProps {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
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
    setStringValue(value != null ? value.toString() : "");
  }, [value]);

  const handleChange = (newValue: string) => {
    // Allow empty string (null value)
    if (newValue === "" || newValue === ".") {
      setStringValue(newValue);
      onChange(null);
      return;
    }

    // Only allow valid number patterns (including decimals and partial decimals)
    if (/^\d*\.?\d*$/.test(newValue)) {
      setStringValue(newValue);
      const numValue = parseFloat(newValue);
      if (!isNaN(numValue)) {
        onChange(numValue);
      }
    }
    // If invalid input, don't update stringValue - this prevents letters from showing
  };

  const handleBlur = () => {
    // Don't validate on blur, let form validation handle it
    // Just clean up the display value if it's invalid
    if (stringValue === "" || stringValue === ".") {
      setStringValue("");
      onChange(null);
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