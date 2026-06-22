import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  try {
    const { patientId, username, password } = await req.json();

    if (!patientId || !username || !password) {
      return NextResponse.json({ error: "Faltan datos." }, { status: 400 });
    }

    // Hash de la contraseña
    const password_hash = await bcrypt.hash(password, 10);

    const { error } = await supabase
      .from("patients")
      .update({ username: username.toLowerCase().trim(), password_hash })
      .eq("id", patientId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
