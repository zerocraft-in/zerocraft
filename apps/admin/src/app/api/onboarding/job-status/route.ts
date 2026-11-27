import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { ok: false, error: "Unauthenticated" },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");

  if (!jobId) {
    return NextResponse.json(
      { ok: false, error: "jobId is required." },
      { status: 400 },
    );
  }

  const { data: job, error } = await supabase
    .from("tenant_provisioning_jobs")
    .select("id, status, current_step, progress, error_code, error_message")
    .eq("id", jobId)
    .single();

  if (error || !job) {
    return NextResponse.json(
      { ok: false, error: "Job not found." },
      { status: 404 },
    );
  }

  const { data: steps, error: stepsError } = await supabase
    .from("tenant_provisioning_job_steps")
    .select("step, status, message")
    .eq("job_id", jobId)
    .order("created_at", { ascending: true });

  if (stepsError) {
    return NextResponse.json(
      { ok: false, error: "Unable to load job steps." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    job: {
      id: job.id,
      status: job.status,
      currentStep: job.current_step,
      progress: job.progress ?? 0,
      errorCode: job.error_code,
      errorMessage: job.error_message,
    },
    steps: (steps ?? []).map((s) => ({
      step: s.step,
      status: s.status,
      message: s.message,
    })),
  });
}
