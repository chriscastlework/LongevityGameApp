"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
} from "@/lib/types/database";

// Schemas for each station type
const balanceSchema = z.object({
  balance_seconds: z
    .number()
    .min(0, "Balance time cannot be negative")
    .max(60, "Balance time cannot exceed 60 seconds"),
});

const breathSchema = z.object({
  balloon_diameter_cm: z
    .number()
    .min(0, "Balloon diameter cannot be negative")
    .max(100, "Balloon diameter cannot exceed 100cm"),
});

const gripSchema = z.object({
  grip_seconds: z
    .number()
    .min(0, "Grip time cannot be negative")
    .max(600, "Grip time cannot exceed 10 minutes"),
});

interface StationEntryFormProps {
  station: StationType;
  participantCode: string;
  onSubmit: (
    data: BalanceMeasurement | BreathMeasurement | GripMeasurement
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
          defaults: { balance_seconds: 0 },
        };
      case "breath":
        return {
          schema: breathSchema,
          defaults: { balloon_diameter_cm: 0 },
        };
      case "grip":
        return {
          schema: gripSchema,
          defaults: { grip_seconds: 0 },
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
              value={field.value || 0}
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
              value={field.value || 0}
              onChange={field.onChange}
              min={0}
              max={100}
              placeholder="25"
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
              value={field.value || 0}
              onChange={field.onChange}
              placeholder="0:00"
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

  const renderFormFields = () => {
    switch (station) {
      case "balance":
        return renderBalanceForm();
      case "breath":
        return renderBreathForm();
      case "grip":
        return renderGripForm();
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
