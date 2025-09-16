import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createRouteHandlerClient } from "@/lib/supabase/server";
import type { StationType, BalanceMeasurement, BreathMeasurement, GripMeasurement, HealthMeasurement } from "@/lib/types/database";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type MeasurementData = BalanceMeasurement | BreathMeasurement | GripMeasurement | HealthMeasurement;

interface StationResultRequest {
  participantCode: string;
  stationType: StationType;
  measurements: MeasurementData;
}

// POST /api/station-results - Save station measurements for a participant
export async function POST(request: NextRequest) {
  try {
    // First verify user authentication with regular client
    const userSupabase = await createRouteHandlerClient();
    const { data: { user }, error: userError } = await userSupabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Now use admin client for database operations
    const supabase = createAdminClient();

    // Check if user has operator or admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'operator' && profile.role !== 'admin')) {
      return NextResponse.json(
        { error: "Insufficient permissions. Operator or admin role required." },
        { status: 403 }
      );
    }

    const body: StationResultRequest = await request.json();
    const { participantCode, stationType, measurements } = body;

    if (!participantCode || !stationType || !measurements) {
      return NextResponse.json(
        { error: "Missing required fields: participantCode, stationType, measurements" },
        { status: 400 }
      );
    }

    // Find the participant by participant_code
    console.log('Looking for participant with code:', participantCode);
    const { data: participant, error: participantError } = await supabase
      .from('participants')
      .select('id, user_id')
      .eq('participant_code', participantCode)
      .single();

    console.log('Participant query result:', { participant, participantError });

    if (participantError || !participant) {
      console.error('Participant not found:', participantError);
      return NextResponse.json(
        { error: "Participant not found" },
        { status: 404 }
      );
    }

    let updateData: any = {};

    // Map measurements to participant table columns based on station type
    switch (stationType) {
      case 'balance':
        const balanceData = measurements as BalanceMeasurement;
        updateData = { balance_seconds: balanceData.balance_seconds };
        break;
      case 'breath':
        const breathData = measurements as BreathMeasurement;
        updateData = { breath_seconds: breathData.breath_seconds };
        break;
      case 'grip':
        const gripData = measurements as GripMeasurement;
        updateData = {
          grip_left_kg: gripData.grip_left_kg,
          grip_right_kg: gripData.grip_right_kg
        };
        break;
      case 'health':
        const healthData = measurements as HealthMeasurement;
        updateData = {
          bp_systolic: healthData.bp_systolic,
          bp_diastolic: healthData.bp_diastolic,
          pulse: healthData.pulse,
          bmi: healthData.bmi,
          muscle_pct: healthData.muscle_pct,
          fat_pct: healthData.fat_pct,
          spo2: healthData.spo2
        };
        break;
      default:
        return NextResponse.json(
          { error: `Unknown station type: ${stationType}` },
          { status: 400 }
        );
    }

    // Update the participant record with measurements
    const { data: updatedParticipant, error: updateError } = await supabase
      .from('participants')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', participant.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating participant measurements:', updateError);
      return NextResponse.json(
        { error: "Failed to save measurements" },
        { status: 500 }
      );
    }

    // Create an audit record in station_audits table if it exists
    try {
      // Note: station_audits table may not exist in current database schema
      // This is optional functionality for audit trail
      console.log('Audit record would be created:', {
        participant_id: participant.id,
        station: stationType,
        payload: measurements,
        actor: user.email || user.id
      });
    } catch (auditError) {
      // If audit table doesn't exist, that's ok - just continue
      console.warn('Could not create audit record:', auditError);
    }

    return NextResponse.json({
      success: true,
      participant_id: participant.id,
      participant_code: participantCode,
      station_type: stationType,
      measurements: measurements,
      updated_at: updatedParticipant.updated_at
    });

  } catch (error) {
    console.error('Station results API error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}