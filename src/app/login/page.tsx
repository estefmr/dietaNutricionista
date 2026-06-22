"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Salad, Eye, EyeOff, Leaf } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Guardar sesión en localStorage
      localStorage.setItem("nutriai_patient_id", data.patientId);
      localStorage.setItem("nutriai_patient_name", data.patientName);

      toast.success(`¡Bienvenido/a, ${data.patientName}!`);
      router.push("/dashboard/patient");
    } catch (error: any) {
      toast.error(error.message || "Error al iniciar sesión.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100dvh",
      width: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      // Fondo propio del login: navy de marca + glow verde, funciona en mobile y desktop
      background: "linear-gradient(135deg, #0f1a2e 0%, #1e293b 100%)",
      backgroundImage: `
        radial-gradient(ellipse 60% 50% at 50% 0%, rgba(0,168,120,0.18) 0%, transparent 60%),
        radial-gradient(ellipse 80% 60% at 50% 100%, rgba(0,168,120,0.10) 0%, transparent 60%),
        linear-gradient(135deg, #0f1a2e 0%, #1e293b 100%)
      `,
      position: "relative",
    }}>
      <div style={{ width: "100%", maxWidth: 400, position: "relative", zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{
            width: 72, height: 72,
            background: "linear-gradient(135deg, #00a878, #007a58)",
            borderRadius: 22,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px",
            boxShadow: "0 8px 32px rgba(0,168,120,0.4), 0 0 0 1px rgba(255,255,255,0.12) inset",
            color: "#ffffff",
          }}>
            <Salad size={34} strokeWidth={2} />
          </div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "#ffffff", margin: "0 0 6px", letterSpacing: "-0.01em" }}>
            NutriAI
          </h1>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.9rem", margin: 0 }}>
            Inicia sesión con tus datos
          </p>
        </div>

        {/* Form card */}
        <div className="meal-card" style={{ padding: "28px 24px" }}>
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            <div>
              <label className="label-premium">Usuario</label>
              <input
                className="input-premium"
                placeholder="tu.usuario"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoCapitalize="none"
                autoComplete="username"
                required
              />
            </div>

            <div>
              <label className="label-premium">Contraseña</label>
              <div style={{ position: "relative" }}>
                <input
                  className="input-premium"
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  style={{ paddingRight: 48 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                  style={{
                    position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer",
                    color: "#94a3b8", padding: 0, display: "flex", alignItems: "center",
                  }}
                >
                  {showPass ? <EyeOff size={20} strokeWidth={2} /> : <Eye size={20} strokeWidth={2} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn-analyze"
              disabled={isLoading}
              style={{ marginTop: 8 }}
            >
              {isLoading ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                  <span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "white", borderRadius: "50%", display: "inline-block", animation: "spin 0.9s linear infinite" }} />
                  Ingresando...
                </span>
              ) : "Ingresar →"}
            </button>
          </form>

          <p style={{ textAlign: "center", fontSize: "0.78rem", color: "#94a3b8", margin: "18px 0 0" }}>
            Tus datos de acceso fueron enviados por tu nutricionista.
          </p>
        </div>

        {/* Footer fuera del card, sobre el fondo oscuro */}
        <p style={{ textAlign: "center", fontSize: "0.75rem", color: "rgba(255,255,255,0.45)", margin: "20px 0 0", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Leaf size={13} strokeWidth={2} /> NutriAI · Plataforma de nutrición asistida
        </p>
      </div>
    </div>
  );
}
