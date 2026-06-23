"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Users, Plus, UserRound, Stethoscope, type LucideIcon } from "lucide-react";

type IconComponent = LucideIcon;

interface Patient {
  id: string;
  name: string;
  diet_instructions: string;
  created_at: string;
  username?: string;
}

interface MealLog {
  id: string;
  meal_type: string;
  is_compliant: boolean;
  feedback: string;
  created_at: string;
}

// ========================
// TAB: LISTA DE PACIENTES
// ========================
function TabPatients({ onSelectPatient }: { onSelectPatient: (p: Patient) => void }) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/patients");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error al cargar pacientes.");
        setPatients(data.patients);
      } catch (err: any) {
        toast.error(err.message || "Error al cargar pacientes.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "48px 0" }}>
        <div className="spinner" style={{ margin: "0 auto 12px" }} />
        <p style={{ color: "#64748b", fontSize: "0.9rem" }}>Cargando pacientes...</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Stats */}
      <div className="nut-stats-row">
        <div className="nut-stat-card" style={{ gridColumn: "1 / -1" }}>
          <p className="nut-stat-number">{patients.length}</p>
          <p className="nut-stat-label">Pacientes activos</p>
        </div>
      </div>

      {/* List */}
      <div>
        <span className="section-label">Mis Pacientes</span>
        {patients.length === 0 ? (
          <div className="empty-patients">
            <div style={{ fontSize: "3rem", marginBottom: 12 }}>👥</div>
            <p style={{ fontWeight: 700, color: "#1e293b", margin: "0 0 6px" }}>Sin pacientes aún</p>
            <p style={{ color: "#94a3b8", fontSize: "0.85rem", margin: 0 }}>
              Ve a "Nuevo" para registrar tu primer paciente
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {patients.map(patient => (
              <button
                key={patient.id}
                className="patient-list-item"
                onClick={() => onSelectPatient(patient)}
              >
                <div className="patient-avatar">
                  {patient.name.charAt(0).toUpperCase()}
                </div>
                <div className="patient-info">
                  <p className="patient-name">{patient.name}</p>
                  <p className="patient-date">
                    Registrado el{" "}
                    {new Date(patient.created_at).toLocaleDateString("es-ES", {
                      day: "2-digit", month: "short", year: "numeric"
                    })}
                  </p>
                </div>
                <span className="patient-chevron">›</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ========================
// TAB: DETALLE DEL PACIENTE
// ========================
function PatientDetail({ patient, onBack }: { patient: Patient; onBack: () => void }) {
  const [logs, setLogs] = useState<MealLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [newPassword, setNewPassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [showResetSuccess, setShowResetSuccess] = useState(false);
  const [isEditingDiet, setIsEditingDiet] = useState(false);
  const [dietDraft, setDietDraft] = useState(patient.diet_instructions);
  const [isSavingDiet, setIsSavingDiet] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/patients/${patient.id}/meal-logs`);
        const data = await res.json();
        if (res.ok) setLogs(data.logs);
      } finally {
        setLoadingLogs(false);
      }
    };
    load();
  }, [patient.id]);

  const usernameToUse = patient.username || patient.name.toLowerCase().trim().replace(/\s+/g, ".").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9.]/g, "");

  const handleResetPassword = async () => {
    if (!newPassword) return;
    setIsResetting(true);
    try {
      const res = await fetch("/api/auth/set-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: patient.id, username: usernameToUse, password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al actualizar contraseña");
      
      patient.username = usernameToUse; 
      setShowResetSuccess(true);
      toast.success("Contraseña actualizada con éxito.");
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  const handleSaveDiet = async () => {
    const next = dietDraft.trim();
    if (!next) {
      toast.error("La dieta no puede estar vacía.");
      return;
    }
    setIsSavingDiet(true);
    try {
      const res = await fetch(`/api/patients/${patient.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diet_instructions: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al actualizar la dieta");
      patient.diet_instructions = next; // refleja el cambio en la vista actual
      setIsEditingDiet(false);
      toast.success("Dieta actualizada con éxito.");
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setIsSavingDiet(false);
    }
  };

  const resetMessage = `¡Hola, *${patient.name}*! He actualizado tus credenciales de acceso para NutriAI:\n\n🌐 Enlace: ${typeof window !== "undefined" ? window.location.origin : ""}/login\n👤 Usuario: *${usernameToUse}*\n🔑 Nueva Contraseña: *${newPassword}*\n\n¡Ya puedes ingresar! 🥗`;
  const resetWhatsappUrl = `https://wa.me/?text=${encodeURIComponent(resetMessage)}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Back + Name */}
      <div className="patient-detail-header">
        <button className="back-btn" onClick={onBack}>←</button>
        <div>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0f1a2e", margin: 0 }}>
            {patient.name}
          </h2>
          <p style={{ fontSize: "0.78rem", color: "#64748b", margin: 0 }}>
            Perfil del Paciente
          </p>
        </div>
      </div>

      {/* Mini stats */}
      <div className="nut-stats-row">
        <div className="nut-stat-card" style={{ gridColumn: "1 / -1" }}>
          <p className="nut-stat-number">{logs.length}</p>
          <p className="nut-stat-label">Comidas analizadas</p>
        </div>
      </div>

      {/* Datos de acceso */}
      <div className="meal-card">
        <p className="profile-section-title">🔑 Acceso del Paciente</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: "0.85rem", color: "#475569" }}>
          <div>
            <strong>Enlace de ingreso:</strong>{" "}
            <span style={{ color: "#00a878", wordBreak: "break-all" }}>
              {typeof window !== "undefined" ? `${window.location.origin}/login` : "/login"}
            </span>
          </div>
          <div>
            <strong>Usuario:</strong> <span style={{ color: "#0f1a2e", fontWeight: 600 }}>{patient.username || "(Se generará: " + usernameToUse + ")"}</span>
          </div>
        </div>

        {/* Cambiar / Generar contraseña */}
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #e2e8f0" }}>
          <label className="label-premium" style={{ fontSize: "0.8rem", display: "block", marginBottom: 6 }}>
            {patient.username ? "Restablecer Contraseña" : "Crear Credenciales de Acceso"}
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="input-premium"
              type="text"
              placeholder="Nueva contraseña sugerida"
              value={newPassword}
              onChange={e => { setNewPassword(e.target.value); setShowResetSuccess(false); }}
              style={{ fontSize: "0.82rem", padding: "8px 12px" }}
            />
            <button
              className="btn-copy"
              style={{ margin: 0, padding: "0 16px", whiteSpace: "nowrap", display: "flex", alignItems: "center", justifyContent: "center" }}
              onClick={handleResetPassword}
              disabled={isResetting || !newPassword}
            >
              {isResetting ? "Guardando..." : "Actualizar"}
            </button>
          </div>
        </div>

        {showResetSuccess && (
          <div style={{ marginTop: 12, padding: 12, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            <p style={{ fontSize: "0.78rem", color: "#166534", margin: 0, fontWeight: 600 }}>
              ¡Contraseña guardada! Compártela con el paciente:
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn-copy"
                style={{ flex: 1, margin: 0, padding: "6px 10px", fontSize: "0.75rem" }}
                onClick={() => {
                  navigator.clipboard.writeText(`Enlace: ${window.location.origin}/login\nUsuario: ${usernameToUse}\nContraseña: ${newPassword}`);
                  toast.success("Credenciales copiadas.");
                }}
              >
                📋 Copiar
              </button>
              <a
                href={resetWhatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-copy"
                style={{
                  flex: 1,
                  margin: 0,
                  padding: "6px 10px",
                  fontSize: "0.75rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                  background: "#25d366",
                  color: "white",
                  border: "none",
                  textDecoration: "none",
                  fontWeight: 600,
                }}
              >
                💬 Enviar WhatsApp
              </a>
            </div>
          </div>
        )}

        {!showResetSuccess && patient.username && (
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button
              className="btn-copy"
              style={{ flex: 1, margin: 0 }}
              onClick={() => {
                const loginUrl = `${window.location.origin}/login`;
                navigator.clipboard.writeText(`Enlace: ${loginUrl}\nUsuario: ${patient.username}`);
                toast.success("Enlace y usuario copiados.");
              }}
            >
              📋 Copiar Enlace y Usuario
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                `¡Hola, *${patient.name}*! Recuerda que puedes ingresar a tu portal de NutriAI en:\n🌐 Enlace: ${window.location.origin}/login\n👤 Usuario: *${patient.username}*\n\nSi no recuerdas tu contraseña, solicítamela para restablecerla. 🥗`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-copy"
              style={{
                flex: 1,
                margin: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                background: "#25d366",
                color: "white",
                border: "none",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              💬 Compartir
            </a>
          </div>
        )}
      </div>

      {/* Dieta asignada */}
      <div className="meal-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <p className="profile-section-title" style={{ margin: 0 }}>🥗 Dieta Asignada</p>
          {!isEditingDiet && (
            <button
              className="btn-copy"
              style={{ margin: 0, padding: "6px 14px", fontSize: "0.78rem", width: "auto" }}
              onClick={() => { setDietDraft(patient.diet_instructions); setIsEditingDiet(true); }}
            >
              ✏️ Editar
            </button>
          )}
        </div>

        {isEditingDiet ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
            <textarea
              className="textarea-premium"
              value={dietDraft}
              onChange={e => setDietDraft(e.target.value)}
              rows={6}
              placeholder="Indicaciones de la dieta..."
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn-analyze"
                style={{ flex: 1, margin: 0 }}
                onClick={handleSaveDiet}
                disabled={isSavingDiet || !dietDraft.trim()}
              >
                {isSavingDiet ? "Guardando..." : "💾 Guardar dieta"}
              </button>
              <button
                className="btn-copy"
                style={{ margin: 0, padding: "0 18px", width: "auto" }}
                onClick={() => { setIsEditingDiet(false); setDietDraft(patient.diet_instructions); }}
                disabled={isSavingDiet}
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="diet-preview-box" style={{ marginTop: 10 }}>{patient.diet_instructions}</div>
        )}
      </div>

      {/* Historial de comidas */}
      <div className="meal-card">
        <p className="profile-section-title">📋 Últimas Comidas Analizadas</p>
        {loadingLogs ? (
          <div style={{ textAlign: "center", padding: 20 }}>
            <div className="spinner" style={{ margin: "0 auto" }} />
          </div>
        ) : logs.length === 0 ? (
          <p style={{ color: "#94a3b8", fontSize: "0.85rem", textAlign: "center", padding: "16px 0" }}>
            El paciente aún no ha analizado ninguna comida.
          </p>
        ) : (
          <div>
            {logs.map(log => (
              <div key={log.id} className="meal-log-item">
                <div>
                  <span className={`meal-log-badge ${log.is_compliant ? "ok" : "fail"}`}>
                    {log.is_compliant ? "✅ OK" : "❌ No cumple"}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: "0.82rem", color: "#1e293b", margin: "0 0 2px" }}>
                    {log.meal_type}
                  </p>
                  <p style={{ fontSize: "0.78rem", color: "#64748b", margin: "0 0 2px", lineHeight: 1.5 }}>
                    {log.feedback}
                  </p>
                  <p style={{ fontSize: "0.7rem", color: "#94a3b8", margin: 0 }}>
                    {new Date(log.created_at).toLocaleDateString("es-ES", {
                      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ========================
// TAB: NUEVO PACIENTE
// ========================
function TabNewPatient({ onCreated }: { onCreated: () => void }) {
  const [patientName, setPatientName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [dietInstructions, setDietInstructions] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [createdInfo, setCreatedInfo] = useState<{ name: string; username: string; password: string } | null>(null);

  const generateUsername = (name: string) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ".")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9.]/g, "");
  };

  const generatePassword = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  useEffect(() => {
    if (patientName) {
      setUsername(prev => prev || generateUsername(patientName));
      setPassword(prev => prev || generatePassword());
    } else {
      setUsername("");
      setPassword("");
    }
  }, [patientName]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const createRes = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: patientName, diet_instructions: dietInstructions }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) throw new Error(createData.error || "Error al crear paciente.");
      const data = createData.patient;

      const res = await fetch("/api/auth/set-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: data.id, username, password }),
      });
      const credData = await res.json();
      if (!res.ok) throw new Error(credData.error || "Error al establecer credenciales.");

      setCreatedInfo({ name: patientName, username, password });
      toast.success("Paciente registrado con éxito.");
      onCreated();
    } catch (error: any) {
      toast.error(`Error: ${error?.message || "Error desconocido"}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (createdInfo) {
    const loginUrl = `${window.location.origin}/login`;
    const message = `¡Hola, *${createdInfo.name}*! Te he registrado en NutriAI.\n\nPuedes iniciar sesión desde cualquier dispositivo para registrar tus comidas y ver tus dietas:\n\n🌐 Enlace: ${loginUrl}\n👤 Usuario: *${createdInfo.username}*\n🔑 Contraseña: *${createdInfo.password}*\n\n¡Nos vemos adentro! 🥗`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="meal-card" style={{ textAlign: "center", padding: "32px 20px" }}>
          <div style={{ fontSize: "3.5rem", marginBottom: 12 }}>🎉</div>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#007a58", margin: "0 0 6px" }}>
            ¡Paciente Registrado!
          </h2>
          <p style={{ fontSize: "0.88rem", color: "#64748b", margin: 0 }}>
            Se han guardado las credenciales de acceso para <strong>{createdInfo.name}</strong>.
          </p>
        </div>

        <div className="meal-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0f1a2e", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            🔑 Datos de Acceso
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: "0.9rem", background: "#f8fafc", padding: 14, borderRadius: 12, border: "1px solid #e2e8f0" }}>
            <div>
              <strong>Enlace:</strong> <span style={{ color: "#00a878", wordBreak: "break-all" }}>{loginUrl}</span>
            </div>
            <div>
              <strong>Usuario:</strong> <code style={{ background: "#e2e8f0", padding: "2px 6px", borderRadius: 4, fontSize: "0.85rem" }}>{createdInfo.username}</code>
            </div>
            <div>
              <strong>Contraseña:</strong> <code style={{ background: "#e2e8f0", padding: "2px 6px", borderRadius: 4, fontSize: "0.85rem" }}>{createdInfo.password}</code>
            </div>
          </div>

          <button
            className="btn-copy"
            onClick={() => {
              navigator.clipboard.writeText(`Enlace: ${loginUrl}\nUsuario: ${createdInfo.username}\nContraseña: ${createdInfo.password}`);
              toast.success("¡Credenciales copiadas!");
            }}
          >
            📋 Copiar Credenciales
          </button>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-copy"
            style={{
              margin: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              background: "#25d366",
              color: "white",
              border: "none",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            💬 Enviar por WhatsApp
          </a>

          <button
            className="btn-new"
            onClick={() => {
              setCreatedInfo(null);
              setPatientName("");
              setUsername("");
              setPassword("");
              setDietInstructions("");
            }}
            style={{ marginTop: 8 }}
          >
            + Registrar otro paciente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="pat-greeting">
        <span className="pat-greeting-icon">➕</span>
        <div>
          <h2 className="pat-greeting-title">Nuevo Paciente</h2>
          <p className="pat-greeting-sub">Registra y asigna una dieta</p>
        </div>
      </div>

      <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="nut-form-grid">
          <div className="meal-card full-width">
            <label className="label-premium">Nombre del paciente</label>
            <input
              className="input-premium"
              placeholder="Ej. María González"
              value={patientName}
              onChange={e => setPatientName(e.target.value)}
              required
            />
          </div>
          <div className="meal-card">
            <label className="label-premium">Usuario de acceso</label>
            <input
              className="input-premium"
              placeholder="maria.gonzalez"
              value={username}
              onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ""))}
              required
            />
          </div>
          <div className="meal-card">
            <label className="label-premium">Contraseña sugerida</label>
            <input
              className="input-premium"
              placeholder="ABC123"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="meal-card full-width">
            <label className="label-premium">Indicaciones de la dieta</label>
            <textarea
              className="textarea-premium"
              placeholder={"Ej: Desayuno: 2 huevos revueltos, 1 rebanada de pan integral.\n\nMáximo 400 calorías. Priorizar proteína."}
              value={dietInstructions}
              onChange={e => setDietInstructions(e.target.value)}
              required
            />
            <p style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: 8 }}>
              💡 Sé específico con porciones y restricciones.
            </p>
          </div>
        </div>
        <button type="submit" className="btn-analyze" disabled={isLoading || !patientName || !username || !password || !dietInstructions}>
          {isLoading ? "Registrando..." : "✅ Crear Paciente y Credenciales"}
        </button>
      </form>
    </div>
  );
}

// ========================
// MAIN NUTRITIONIST APP
// ========================
const NUT_TABS: { id: string; Icon: IconComponent; label: string }[] = [
  { id: "patients", Icon: Users, label: "Pacientes" },
  { id: "new", Icon: Plus, label: "Nuevo" },
];

export default function NutritionistDashboard() {
  const [activeTab, setActiveTab] = useState("patients");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSelectPatient = (p: Patient) => {
    setSelectedPatient(p);
    setActiveTab("patients");
  };

  const handleCreated = () => setRefreshKey(k => k + 1);

  return (
    <div className="app-shell">
      {/* Header */}
      <div className="nut-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative", zIndex: 1 }}>
          <div>
            <div className="nut-badge">
              <Stethoscope size={14} strokeWidth={2.4} /> Nutricionista
            </div>
            <h1 style={{ fontSize: "1.4rem", fontWeight: 700, color: "white", margin: 0, position: "relative", zIndex: 1 }}>
              {selectedPatient ? selectedPatient.name : activeTab === "patients" ? "Mis Pacientes" : "Nuevo Paciente"}
            </h1>
            <p style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.6)", position: "relative", zIndex: 1, margin: "4px 0 0" }}>
              {selectedPatient ? "Perfil del paciente"
                : activeTab === "patients" ? "Gestiona tu lista de pacientes"
                : "Registra y asigna una dieta"}
            </p>
          </div>
          <div style={{ width: 46, height: 46, background: "rgba(0,168,120,0.2)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 1, color: "#ffffff", border: "1px solid rgba(255,255,255,0.08)" }}>
            {selectedPatient
              ? <UserRound size={22} strokeWidth={2} />
              : activeTab === "patients"
                ? <Users size={22} strokeWidth={2} />
                : <Plus size={22} strokeWidth={2.4} />}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="app-content">
        {selectedPatient ? (
          <PatientDetail
            patient={selectedPatient}
            onBack={() => setSelectedPatient(null)}
          />
        ) : activeTab === "patients" ? (
          <TabPatients key={refreshKey} onSelectPatient={handleSelectPatient} />
        ) : (
          <TabNewPatient onCreated={handleCreated} />
        )}
        <div className="safe-bottom" />
      </div>

      {/* Bottom nav: siempre fijo abajo, incluso en el detalle del paciente */}
      <nav className="nut-bottom-nav">
        {NUT_TABS.map(item => {
          const Icon = item.Icon;
          // En el detalle del paciente ningún tab está "activo"; tocar uno
          // cierra el detalle y navega al tab correspondiente.
          const isActive = !selectedPatient && activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`nut-nav-item ${isActive ? "active" : ""}`}
              onClick={() => {
                setSelectedPatient(null);
                setActiveTab(item.id);
              }}
            >
              <span className="nut-nav-icon"><Icon size={22} strokeWidth={2} /></span>
              <span className="nut-nav-label">{item.label}</span>
              {isActive && <span className="nut-nav-indicator" />}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
