"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";

import type { StationType, BalanceMeasurement, BreathMeasurement, GripMeasurement, HealthMeasurement } from "@/lib/types/database";

// Schemas for each station type
const balanceSchema = z.object({
  balance_seconds: z.number()
    .min(0, "Balance time cannot be negative")
    .max(60, "Balance time cannot exceed 60 seconds"),
});

const breathSchema = z.object({
  breath_seconds: z.number()
    .min(0, "Breath hold time cannot be negative")
    .max(120, "Breath hold time cannot exceed 120 seconds"),
});

const gripSchema = z.object({
  grip_left_kg: z.number()
    .min(0, "Grip strength cannot be negative")
    .max(120, "Grip strength cannot exceed 120kg"),
  grip_right_kg: z.number()
    .min(0, "Grip strength cannot be negative")
    .max(120, "Grip strength cannot exceed 120kg"),
});

const healthSchema = z.object({
  bp_systolic: z.number()
    .min(70, "Systolic BP must be between 70-220 mmHg")
    .max(220, "Systolic BP must be between 70-220 mmHg"),
  bp_diastolic: z.number()
    .min(40, "Diastolic BP must be between 40-140 mmHg")
    .max(140, "Diastolic BP must be between 40-140 mmHg"),
  pulse: z.number()
    .min(30, "Pulse must be between 30-200 bpm")
    .max(200, "Pulse must be between 30-200 bpm"),
  bmi: z.number()
    .min(10, "BMI must be between 10-60")
    .max(60, "BMI must be between 10-60"),
  muscle_pct: z.number()
    .min(0, "Muscle percentage must be between 0-80%")
    .max(80, "Muscle percentage must be between 0-80%"),
  fat_pct: z.number()
    .min(0, "Fat percentage must be between 0-80%")
    .max(80, "Fat percentage must be between 0-80%"),
  spo2: z.number()
    .min(70, "SpO2 must be between 70-100%")
    .max(100, "SpO2 must be between 70-100%"),
});

interface StationEntryFormProps {
  station: StationType;
  participantCode: string;
  onSubmit: (data: BalanceMeasurement | BreathMeasurement | GripMeasurement | HealthMeasurement) => void;
}

export function StationEntryForm({ station, participantCode, onSubmit }: StationEntryFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get the appropriate schema based on station type
  const getSchema = () => {
    switch (station) {
      case "balance": return balanceSchema;
      case "breath": return breathSchema;
      case "grip": return gripSchema;
      case "health": return healthSchema;
      default: return z.object({});
    }
  };

  const form = useForm({
    resolver: zodResolver(getSchema()),
    defaultValues: getDefaultValues(),
  });

  function getDefaultValues() {
    switch (station) {
      case "balance":
        return { balance_seconds: 0 };
      case "breath":
        return { breath_seconds: 0 };
      case "grip":
        return { grip_left_kg: 0, grip_right_kg: 0 };
      case "health":
        return {
          bp_systolic: 120,
          bp_diastolic: 80,
          pulse: 72,
          bmi: 22.0,
          muscle_pct: 30.0,
          fat_pct: 15.0,
          spo2: 98,
        };
      default:
        return {};
    }
  }

  const handleSubmit = async (data: any) => {
    setIsSubmitting(true);
    setError(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
      onSubmit(data);
    } catch (err: any) {
      setError(err.message || "Failed to submit measurements");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderBalanceForm = () => (
    <FormField
      control={form.control}
      name="balance_seconds"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Balance Time (seconds)</FormLabel>
          <FormControl>
            <Input
              {...field}
              type="number"
              min="0"
              max="60"
              step="0.1"
              placeholder="45.5"
              onChange={(e) => field.onChange(parseFloat(e.target.value))}
            />
          </FormControl>
          <FormDescription>
            Time participant maintained balance (0-60 seconds)
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const renderBreathForm = () => (
    <FormField
      control={form.control}
      name="breath_seconds"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Breath Hold Time (seconds)</FormLabel>
          <FormControl>
            <Input
              {...field}
              type="number"
              min="0"
              max="120"
              step="0.1"
              placeholder="30.0"
              onChange={(e) => field.onChange(parseFloat(e.target.value))}
            />
          </FormControl>
          <FormDescription>
            Time participant held their breath (0-120 seconds)
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const renderGripForm = () => (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="grip_left_kg"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Left Hand Grip Strength (kg)</FormLabel>
            <FormControl>
              <Input
                {...field}
                type="number"
                min="0"
                max="120"
                step="0.1"
                placeholder="35.5"
                onChange={(e) => field.onChange(parseFloat(e.target.value))}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="grip_right_kg"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Right Hand Grip Strength (kg)</FormLabel>
            <FormControl>
              <Input
                {...field}
                type="number"
                min="0"
                max="120"
                step="0.1"
                placeholder="37.2"
                onChange={(e) => field.onChange(parseFloat(e.target.value))}
              />
            </FormControl>
            <FormDescription>
              Maximum grip strength for each hand in kilograms
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  const renderHealthForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="bp_systolic"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Systolic BP (mmHg)</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="number"
                  min="70"
                  max="220"
                  placeholder="120"
                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="bp_diastolic"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Diastolic BP (mmHg)</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="number"
                  min="40"
                  max="140"
                  placeholder="80"
                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="pulse"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Heart Rate (bpm)</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="number"
                  min="30"
                  max="200"
                  placeholder="72"
                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="spo2"
          render={({ field }) => (
            <FormItem>
              <FormLabel>SpO2 (%)</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="number"
                  min="70"
                  max="100"
                  placeholder="98"
                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="bmi"
        render={({ field }) => (
          <FormItem>
            <FormLabel>BMI</FormLabel>
            <FormControl>
              <Input
                {...field}
                type="number"
                min="10"
                max="60"
                step="0.1"
                placeholder="22.5"
                onChange={(e) => field.onChange(parseFloat(e.target.value))}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="muscle_pct"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Muscle Percentage (%)</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="number"
                  min="0"
                  max="80"
                  step="0.1"
                  placeholder="30.0"
                  onChange={(e) => field.onChange(parseFloat(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="fat_pct"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fat Percentage (%)</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="number"
                  min="0"
                  max="80"
                  step="0.1"
                  placeholder="15.0"
                  onChange={(e) => field.onChange(parseFloat(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );

  const renderFormFields = () => {
    switch (station) {
      case "balance": return renderBalanceForm();
      case "breath": return renderBreathForm();
      case "grip": return renderGripForm();
      case "health": return renderHealthForm();
      default: return <div>Unknown station type</div>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
        <p className="text-sm font-medium">
          Recording for: <span className="text-blue-700 dark:text-blue-300">{participantCode}</span>
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {renderFormFields()}

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Recording Measurements...
              </>
            ) : (
              "Record Measurements"
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}