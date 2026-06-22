import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: "Usuario y contraseña requeridos." }, { status: 400 });
    }

    // Buscar paciente por username
    const { data: patient, error } = await supabase
      .from("patients")
      .select("id, name, username, password_hash")
      .eq("username", username.toLowerCase().trim())
      .single();

    if (error || !patient || !patient.password_hash) {
      return NextResponse.json({ error: "Usuario o contraseña incorrectos." }, { status: 401 });
    }

    // Verificar contraseña
    const valid = await bcrypt.compare(password, patient.password_hash);
    if (!valid) {
      return NextResponse.json({ error: "Usuario o contraseña incorrectos." }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      patientId: patient.id,
      patientName: patient.name,
    });
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
