import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// PATCH /api/patients/[id] → actualiza la dieta (y opcionalmente el nombre)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { diet_instructions, name } = await req.json();

    const updates: { diet_instructions?: string; name?: string } = {};
    if (typeof diet_instructions === "string") updates.diet_instructions = diet_instructions.trim();
    if (typeof name === "string" && name.trim()) updates.name = name.trim();

    if (!updates.diet_instructions && !updates.name) {
      return NextResponse.json(
        { error: "No hay cambios para guardar." },
        { status: 400 }
      );
    }
    if (updates.diet_instructions === "") {
      return NextResponse.json(
        { error: "Las instrucciones de la dieta no pueden estar vacías." },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("patients")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || "No se encontró el paciente." },
        { status: 404 }
      );
    }
    return NextResponse.json({ patient: data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Error al actualizar el paciente." },
      { status: 500 }
    );
  }
}
