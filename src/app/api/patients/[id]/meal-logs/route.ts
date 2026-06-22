import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// GET /api/patients/[id]/meal-logs → últimos 20 registros de comidas del paciente
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "ID requerido." }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("meal_logs")
      .select("*")
      .eq("patient_id", id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw error;
    return NextResponse.json({ logs: data ?? [] });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Error al obtener comidas." },
      { status: 500 }
    );
  }
}
