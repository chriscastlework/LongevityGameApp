"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { TimeInput } from "@/components/ui/time-input";
import { NumberInput } from "@/components/ui/number-input";

import type {
  StationType,
  BalanceMeasurement,
  BreathMeasurement,
  GripMeasurement,
  HealthMeasurement,
} from "@/lib/types/database";

// Schemas for each station type
const balanceSchema = z.object({
  balance_seconds: z
    .number({ required_error: "Balance time is required" })
    .min(0, "Balance time cannot be negative")
    .max(60, "Balance time cannot exceed 60 seconds"),
});

const breathSchema = z.object({
  balloon_diameter_cm: z
    .number({ required_error: "Balloon diameter is required" })
    .min(0, "Balloon diameter cannot be negative")
    .max(100, "Balloon diameter cannot exceed 100cm"),
});

const gripSchema = z.object({
  grip_seconds: z
    .number({ required_error: "Grip time is required" })
    .min(0, "Grip time cannot be negative")
    .max(600, "Grip time cannot exceed 10 minutes"),
});

const healthSchema = z.object({
  bp_systolic: z
    .number({ required_error: "Systolic BP is required" })
    .min(50, "Systolic BP too low")
    .max(250, "Systolic BP too high"),
  bp_diastolic: z
    .number({ required_error: "Diastolic BP is required" })
    .min(30, "Diastolic BP too low")
    .max(150, "Diastolic BP too high"),
  pulse: z
    .number({ required_error: "Heart rate is required" })
    .min(30, "Heart rate too low")
    .max(200, "Heart rate too high"),
  spo2: z
    .number({ required_error: "SpO₂ is required" })
    .min(70, "SpO₂ too low")
    .max(100, "SpO₂ cannot exceed 100%"),
  bmi: z
    .number({ required_error: "BMI is required" })
    .min(10, "BMI too low")
    .max(60, "BMI too high"),
});

interface StationEntryFormProps {
  station: StationType;
  participantCode: string;
  onSubmit: (
    data:
      | BalanceMeasurement
      | BreathMeasurement
      | GripMeasurement
      | HealthMeasurement
  ) => void;
  isSubmitting?: boolean;
}

export function StationEntryForm({
  station,
  participantCode,
  onSubmit,
  isSubmitting = false,
}: StationEntryFormProps) {
  const [error, setError] = useState<string | null>(null);

  // Get the appropriate schema and default values based on station type
  const getSchemaAndDefaults = () => {
    switch (station) {
      case "balance":
        return {
          schema: balanceSchema,
          defaults: { balance_seconds: null },
        };
      case "breath":
        return {
          schema: breathSchema,
          defaults: { balloon_diameter_cm: null },
        };
      case "grip":
        return {
          schema: gripSchema,
          defaults: { grip_seconds: null },
        };
      case "health":
        return {
          schema: healthSchema,
          defaults: {
            bp_systolic: null,
            bp_diastolic: null,
            pulse: null,
            spo2: null,
            bmi: null,
          },
        };
      default:
        return {
          schema: z.object({}),
          defaults: {},
        };
    }
  };

  // Use any to avoid TypeScript union type issues with useForm
  const { schema, defaults } = getSchemaAndDefaults();
  const form = useForm<any>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  const handleSubmit = async (data: any) => {
    setError(null);

    try {
      await onSubmit(data);
    } catch (err: any) {
      setError(err.message || "Failed to submit measurements");
    }
  };

  const renderBalanceForm = () => (
    <FormField
      control={form.control}
      name="balance_seconds"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Balance Time</FormLabel>
          <FormControl>
            <TimeInput
              value={field.value}
              onChange={field.onChange}
              placeholder="0:00"
              maxMinutes={1}
            />
          </FormControl>
          <FormDescription>
            Time participant maintained balance (maximum 1 minute)
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const renderBreathForm = () => (
    <FormField
      control={form.control}
      name="balloon_diameter_cm"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Balloon Diameter (cm)</FormLabel>
          <FormControl>
            <NumberInput
              value={field.value}
              onChange={field.onChange}
              min={0}
              max={100}
            />
          </FormControl>
          <FormDescription>
            Diameter of the balloon in centimeters (0-100cm)
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const renderGripForm = () => (
    <FormField
      control={form.control}
      name="grip_seconds"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Grip Strength Time</FormLabel>
          <FormControl>
            <TimeInput
              value={field.value}
              onChange={field.onChange}
              maxMinutes={10}
            />
          </FormControl>
          <FormDescription>
            Time participant maintained grip strength (maximum 10 minutes)
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const renderHealthForm = () => (
    <div className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg mb-4">
        <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
          Complete all health measurements for this participant
        </p>
      </div>

      {/* Blood Pressure */}
      <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
        <h3 className="text-lg font-semibold mb-3">Blood Pressure</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="bp_systolic"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Systolic BP (mmHg)</FormLabel>
                <FormControl>
                  <NumberInput
                    value={field.value}
                    onChange={field.onChange}
                    min={50}
                    max={250}
                  />
                </FormControl>
                <FormDescription>
                  Above Average: 100-129, Average: 130-139, Bad: &ge;140
                </FormDescription>
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
                  <NumberInput
                    value={field.value}
                    onChange={field.onChange}
                    min={30}
                    max={150}
                  />
                </FormControl>
                <FormDescription>
                  Above Average: 60-79, Average: 80-89, Bad: &ge;90
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* Heart Rate and SpO2 */}
      <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
        <h3 className="text-lg font-semibold mb-3">Vital Signs</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="pulse"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Heart Rate (bpm)</FormLabel>
                <FormControl>
                  <NumberInput
                    value={field.value}
                    onChange={field.onChange}
                    min={30}
                    max={200}
                  />
                </FormControl>
                <FormDescription>
                  Above Average: 50-70, Average: 71-85, Bad: &gt;85
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="spo2"
            render={({ field }) => (
              <FormItem>
                <FormLabel>SpO₂ (%)</FormLabel>
                <FormControl>
                  <NumberInput
                    value={field.value}
                    onChange={field.onChange}
                    min={70}
                    max={100}
                  />
                </FormControl>
                <FormDescription>
                  Above Average: 97-100%, Average: 94-96%, Bad: &le;93%
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* BMI */}
      <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
        <h3 className="text-lg font-semibold mb-3">Body Mass Index</h3>
        <FormField
          control={form.control}
          name="bmi"
          render={({ field }) => (
            <FormItem>
              <FormLabel>BMI</FormLabel>
              <FormControl>
                <NumberInput
                  value={field.value}
                  onChange={field.onChange}
                  min={10}
                  max={60}
                  step={0.1}
                />
              </FormControl>
              <FormDescription>
                Above Average: 18.5-24.9, Average: 25-29.9, Bad: &ge;30 or
                &lt;18.5
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );

  const renderFormFields = () => {
    switch (station) {
      case "balance":
        return renderBalanceForm();
      case "breath":
        return renderBreathForm();
      case "grip":
        return renderGripForm();
      case "health":
        return renderHealthForm();
      default:
        return <div>Unknown station type</div>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
        <p className="text-sm font-medium">
          Recording for:{" "}
          <span className="text-blue-700 dark:text-blue-300">
            {participantCode}
          </span>
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
