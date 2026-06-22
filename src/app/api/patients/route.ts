import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// GET /api/patients → lista todos los pacientes del nutricionista
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("patients")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ patients: data ?? [] });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Error al obtener pacientes." },
      { status: 500 }
    );
  }
}

// POST /api/patients → crea un paciente nuevo
export async function POST(req: Request) {
  try {
    const { name, diet_instructions } = await req.json();

    if (!name || !diet_instructions) {
      return NextResponse.json(
        { error: "Nombre e instrucciones de dieta son requeridos." },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("patients")
      .insert([{ name, diet_instructions }])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ patient: data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Error al crear paciente." },
      { status: 500 }
    );
  }
}
