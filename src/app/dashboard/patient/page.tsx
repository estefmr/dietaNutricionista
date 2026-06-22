"use client";

import { useState, Suspense, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Utensils, UserRound, TrendingUp, type LucideIcon } from "lucide-react";

type IconComponent = LucideIcon;

// ========================
// TYPES
// ========================
interface PatientProfile {
  name: string;
  age: string;
  weight: string;
  height: string;
  goal: string;
  phone: string;
}

interface ProgressEntry {
  id: string;
  date: string;
  weight: string;
  waist: string;
  hips: string;
  chest: string;
  notes: string;
  imageData: string | null;
}

const MEAL_TYPES = [
  { id: "Desayuno", emoji: "🌅", label: "Desayuno" },
  { id: "Almuerzo", emoji: "☀️", label: "Almuerzo" },
  { id: "Cena", emoji: "🌙", label: "Cena" },
  { id: "Snack", emoji: "🍎", label: "Snack" },
];

// Reduce el tamaño de la imagen antes de mandarla a Claude.
// Los tokens de visión escalan con el área en píxeles, así que recortar
// fotos de teléfono (típicamente 4000×3000) a 1024px corta ~85% del costo.
async function resizeImageToDataUrl(file: File, maxDim = 1024, quality = 0.85): Promise<string> {
  const originalUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = originalUrl;
    });
    const ratio = Math.min(maxDim / img.width, maxDim / img.height, 1);
    const w = Math.round(img.width * ratio);
    const h = Math.round(img.height * ratio);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas no disponible");
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(originalUrl);
  }
}

// ========================
// TAB: ANALIZAR COMIDA
// ========================
interface MealAnalysisResult {
  cumple_estandar: boolean;
  justificacion: string;
  recomendaciones?: string;
}

function TabAnalyze({ patientId }: { patientId: string }) {
  const [mealType, setMealType] = useState("Desayuno");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<MealAnalysisResult | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setResult(null);
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setIsAnalyzing(true);
    setResult(null);

    try {
      const image = await resizeImageToDataUrl(file);
      const response = await fetch("/api/analyze-meal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, mealType, image }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Error al analizar.");
      setResult(data.result);
      data.result.cumple_estandar
        ? toast.success("¡Tu plato cumple con la dieta!")
        : toast.warning("El plato no cumple completamente la dieta.");
    } catch (error: any) {
      toast.error(error.message || "Error inesperado.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Greeting */}
      <div className="pat-greeting">
        <span className="pat-greeting-icon">🥗</span>
        <div>
          <h2 className="pat-greeting-title">¿Qué vas a comer?</h2>
          <p className="pat-greeting-sub">Tu nutricionista lo revisará</p>
        </div>
      </div>

      <form onSubmit={handleAnalyze} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Meal chips */}
        <div>
          <span className="section-label">Tipo de comida</span>
          <div className="meal-chips">
            {MEAL_TYPES.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`meal-chip ${mealType === m.id ? "active" : ""}`}
                onClick={() => { setMealType(m.id); setResult(null); }}
              >
                <span className="emoji">{m.emoji}</span>
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Upload */}
        <div>
          <span className="section-label">Foto del plato</span>
          {!previewUrl ? (
            <div className="upload-zone">
              <input type="file" accept="image/*" onChange={handleFileChange} />
              <div className="upload-icon">📸</div>
              <p style={{ fontWeight: 600, color: "#1e293b", margin: "0 0 4px", fontSize: "0.95rem" }}>Toca para subir una foto</p>
              <p style={{ color: "#94a3b8", fontSize: "0.82rem", margin: 0 }}>JPG, PNG o WEBP desde tu dispositivo</p>
            </div>
          ) : (
            <div className="image-preview">
              <img src={previewUrl} alt="Foto de tu plato" />
              <label htmlFor="photo-change">
                <div className="change-badge">📷 Cambiar foto</div>
                <input id="photo-change" type="file" accept="image/*" onChange={handleFileChange} style={{ display: "none" }} />
              </label>
            </div>
          )}
        </div>

        {!isAnalyzing && !result && (
          <button type="submit" className="btn-analyze" disabled={!file}>
            Enviar foto al nutricionista
          </button>
        )}
      </form>

      {isAnalyzing && (
        <div className="analyzing-state">
          <div className="spinner" />
          <p style={{ fontWeight: 700, color: "#0f1a2e", margin: "0 0 4px" }}>Evaluando tu plato...</p>
          <p style={{ color: "#64748b", fontSize: "0.85rem", margin: 0 }}>Verificando con las indicaciones de tu nutricionista</p>
        </div>
      )}

      {result && !isAnalyzing && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className={`verdict-card ${result.cumple_estandar ? "approved" : "rejected"}`}>
            <div className="verdict-icon">{result.cumple_estandar ? "✅" : "❌"}</div>
            <div className="verdict-title">
              {result.cumple_estandar
                ? "¡Excelente, estás cumpliendo con la dieta!"
                : "Tu plato no coincide con la dieta"}
            </div>
            <p className="verdict-text">{result.justificacion}</p>
          </div>

          {result.recomendaciones && (
            <div className="recommendations-card">
              <div className="recommendations-header">
                <span className="recommendations-badge">Tu nutricionista</span>
              </div>
              <p className="recommendations-text">{result.recomendaciones}</p>
            </div>
          )}

          <button className="btn-analyze" type="button" onClick={() => { setResult(null); setFile(null); setPreviewUrl(null); }}>
            📷 Analizar otra comida
          </button>
        </div>
      )}
    </div>
  );
}

// ========================
// TAB: MI PERFIL
// ========================
function TabProfile({ patientId, onLogout }: { patientId: string; onLogout: () => void }) {
  const [profile, setProfile] = useState<PatientProfile>({
    name: "", age: "", weight: "", height: "", goal: "", phone: "",
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(`nutriai_profile_${patientId}`);
    if (stored) setProfile(JSON.parse(stored));
  }, [patientId]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem(`nutriai_profile_${patientId}`, JSON.stringify(profile));
    setSaved(true);
    toast.success("Perfil guardado correctamente.");
    setTimeout(() => setSaved(false), 3000);
  };

  const set = (key: keyof PatientProfile) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setProfile(prev => ({ ...prev, [key]: e.target.value }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div className="pat-greeting">
        <span className="pat-greeting-icon">👤</span>
        <div>
          <h2 className="pat-greeting-title">Mi Perfil</h2>
          <p className="pat-greeting-sub">Tus datos para el nutricionista</p>
        </div>
      </div>

      <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Personal data card */}
        <div className="meal-card">
          <p className="profile-section-title">📋 Datos Personales</p>
          <div className="profile-grid">
            <div className="profile-field">
              <label className="label-premium">Nombre completo</label>
              <input className="input-premium" placeholder="Ej. María González" value={profile.name} onChange={set("name")} />
            </div>
            <div className="profile-field">
              <label className="label-premium">Teléfono</label>
              <input className="input-premium" type="tel" placeholder="+1 234 567 890" value={profile.phone} onChange={set("phone")} />
            </div>
            <div className="profile-field">
              <label className="label-premium">Edad</label>
              <input className="input-premium" type="number" placeholder="Ej. 28" value={profile.age} onChange={set("age")} min="1" max="120" />
            </div>
          </div>
        </div>

        {/* Metrics card */}
        <div className="meal-card">
          <p className="profile-section-title">📏 Medidas Iniciales</p>
          <div className="profile-grid">
            <div className="profile-field">
              <label className="label-premium">Peso (kg)</label>
              <input className="input-premium" type="number" placeholder="Ej. 72.5" value={profile.weight} onChange={set("weight")} step="0.1" />
            </div>
            <div className="profile-field">
              <label className="label-premium">Altura (cm)</label>
              <input className="input-premium" type="number" placeholder="Ej. 165" value={profile.height} onChange={set("height")} />
            </div>
          </div>
        </div>

        {/* Goal card */}
        <div className="meal-card">
          <p className="profile-section-title">🎯 Objetivo</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { val: "perder_peso", label: "Perder peso", emoji: "🔥" },
              { val: "ganar_musculo", label: "Ganar músculo", emoji: "💪" },
              { val: "mantener", label: "Mantener peso", emoji: "⚖️" },
              { val: "mejorar_salud", label: "Mejorar hábitos", emoji: "🌿" },
            ].map(g => (
              <button
                key={g.val}
                type="button"
                onClick={() => setProfile(p => ({ ...p, goal: g.val }))}
                className={`goal-chip ${profile.goal === g.val ? "active" : ""}`}
              >
                <span>{g.emoji}</span>
                {g.label}
                {profile.goal === g.val && <span style={{ marginLeft: "auto" }}>✓</span>}
              </button>
            ))}
          </div>
        </div>

        <button type="submit" className="btn-analyze">
          {saved ? "✅ Guardado" : "💾 Guardar Perfil"}
        </button>
        <button
          type="button"
          onClick={onLogout}
          style={{
            marginTop: 10,
            width: "100%",
            padding: "12px",
            borderRadius: "14px",
            border: "1px solid #fee2e2",
            background: "#fef2f2",
            color: "#ef4444",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.2s",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8
          }}
        >
          🚪 Cerrar Sesión
        </button>
      </form>
    </div>
  );
}

// ========================
// TAB: MI AVANCE
// ========================
function TabProgress({ patientId }: { patientId: string }) {
  const [entries, setEntries] = useState<ProgressEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ weight: "", waist: "", hips: "", chest: "", notes: "", imageData: null as string | null });
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem(`nutriai_progress_${patientId}`);
    if (stored) setEntries(JSON.parse(stored));
  }, [patientId]);

  const saveEntries = (updated: ProgressEntry[]) => {
    setEntries(updated);
    localStorage.setItem(`nutriai_progress_${patientId}`, JSON.stringify(updated));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const data = reader.result as string;
      setForm(p => ({ ...p, imageData: data }));
      setPreviewImg(data);
    };
    reader.readAsDataURL(file);
  };

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const entry: ProgressEntry = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" }),
      ...form,
    };
    const updated = [entry, ...entries];
    saveEntries(updated);
    setShowForm(false);
    setForm({ weight: "", waist: "", hips: "", chest: "", notes: "", imageData: null });
    setPreviewImg(null);
    toast.success("¡Avance registrado!");
  };

  const handleDelete = (id: string) => {
    const updated = entries.filter(e => e.id !== id);
    saveEntries(updated);
    toast.info("Registro eliminado.");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div className="pat-greeting" style={{ marginBottom: 0 }}>
          <span className="pat-greeting-icon">📊</span>
          <div>
            <h2 className="pat-greeting-title">Mi Avance</h2>
            <p className="pat-greeting-sub">{entries.length} registro{entries.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        {!showForm && (
          <button className="btn-add-entry" onClick={() => setShowForm(true)}>+ Nuevo</button>
        )}
      </div>

      {/* New entry form */}
      {showForm && (
        <div className="progress-form-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <p style={{ fontWeight: 700, fontSize: "1rem", margin: 0, color: "#0f1a2e" }}>📝 Nuevo Registro</p>
            <button onClick={() => { setShowForm(false); setPreviewImg(null); setForm({ weight: "", waist: "", hips: "", chest: "", notes: "", imageData: null }); }}
              style={{ background: "none", border: "none", fontSize: "1.4rem", cursor: "pointer", color: "#94a3b8" }}>×</button>
          </div>
          <form onSubmit={handleAddEntry} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Photo upload */}
            <div>
              <label className="label-premium">Foto (opcional)</label>
              {!previewImg ? (
                <div className="upload-zone" style={{ padding: "20px" }} onClick={() => fileRef.current?.click()}>
                  <div style={{ fontSize: "1.8rem" }}>🤳</div>
                  <p style={{ margin: "6px 0 0", fontSize: "0.85rem", color: "#64748b" }}>Añadir foto de avance</p>
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleImageChange} style={{ display: "none" }} />
                </div>
              ) : (
                <div style={{ position: "relative", borderRadius: 16, overflow: "hidden" }}>
                  <img src={previewImg} alt="preview" style={{ width: "100%", height: 160, objectFit: "cover" }} />
                  <button type="button" onClick={() => { setPreviewImg(null); setForm(p => ({ ...p, imageData: null })); }}
                    style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.6)", color: "white", border: "none", borderRadius: "50%", width: 28, height: 28, cursor: "pointer", fontSize: "0.9rem" }}>
                    ×
                  </button>
                </div>
              )}
            </div>

            {/* Metrics */}
            <div className="progress-metrics-grid">
              {[
                { key: "weight", label: "Peso (kg)", placeholder: "72.5" },
                { key: "waist", label: "Cintura (cm)", placeholder: "80" },
                { key: "hips", label: "Cadera (cm)", placeholder: "95" },
                { key: "chest", label: "Pecho (cm)", placeholder: "90" },
              ].map(field => (
                <div key={field.key}>
                  <label className="label-premium">{field.label}</label>
                  <input
                    className="input-premium"
                    type="number"
                    placeholder={field.placeholder}
                    value={(form as any)[field.key]}
                    onChange={e => setForm(p => ({ ...p, [field.key]: e.target.value }))}
                    step="0.1"
                  />
                </div>
              ))}
            </div>

            {/* Notes */}
            <div>
              <label className="label-premium">Notas / cómo te sientes</label>
              <textarea
                className="textarea-premium"
                style={{ minHeight: 80 }}
                placeholder="Ej. Me siento con más energía, bajé 1.5 kg esta semana..."
                value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              />
            </div>

            <button type="submit" className="btn-analyze">💾 Guardar Registro</button>
          </form>
        </div>
      )}

      {/* History */}
      {entries.length === 0 && !showForm ? (
        <div className="progress-empty">
          <div style={{ fontSize: "3rem", marginBottom: 12 }}>📈</div>
          <p style={{ fontWeight: 700, color: "#1e293b", margin: "0 0 6px" }}>Sin registros aún</p>
          <p style={{ color: "#94a3b8", fontSize: "0.85rem", margin: 0 }}>Toca "+ Nuevo" para registrar tu primer avance</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {entries.map((entry, index) => (
            <div key={entry.id} className="progress-entry-card">
              {/* Timeline dot */}
              <div className="timeline-dot" style={{ background: index === 0 ? "#00a878" : "#e2e8f0" }} />

              {/* Image if any */}
              {entry.imageData && (
                <div style={{ borderRadius: 14, overflow: "hidden", marginBottom: 12 }}>
                  <img src={entry.imageData} alt="Foto de avance" style={{ width: "100%", height: 180, objectFit: "cover" }} />
                </div>
              )}

              {/* Date & badge */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span className="entry-date">📅 {entry.date}</span>
                {index === 0 && <span className="entry-badge-latest">Más reciente</span>}
              </div>

              {/* Metrics pills */}
              {(entry.weight || entry.waist || entry.hips || entry.chest) && (
                <div className="entry-metrics">
                  {entry.weight && <div className="metric-pill"><span className="metric-label">⚖️ Peso</span><span className="metric-value">{entry.weight} kg</span></div>}
                  {entry.waist && <div className="metric-pill"><span className="metric-label">📏 Cintura</span><span className="metric-value">{entry.waist} cm</span></div>}
                  {entry.hips && <div className="metric-pill"><span className="metric-label">📏 Cadera</span><span className="metric-value">{entry.hips} cm</span></div>}
                  {entry.chest && <div className="metric-pill"><span className="metric-label">📏 Pecho</span><span className="metric-value">{entry.chest} cm</span></div>}
                </div>
              )}

              {/* Notes */}
              {entry.notes && (
                <p style={{ fontSize: "0.88rem", color: "#475569", margin: "10px 0 0", lineHeight: 1.5, fontStyle: "italic" }}>
                  "{entry.notes}"
                </p>
              )}

              {/* Delete */}
              <button
                onClick={() => handleDelete(entry.id)}
                style={{ marginTop: 12, background: "none", border: "none", color: "#94a3b8", fontSize: "0.78rem", cursor: "pointer", padding: 0, textAlign: "left" }}>
                🗑 Eliminar registro
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ========================
// BOTTOM NAV
// ========================
const NAV_ITEMS: { id: string; Icon: IconComponent; label: string }[] = [
  { id: "analyze", Icon: Utensils, label: "Analizar" },
  { id: "profile", Icon: UserRound, label: "Mi Perfil" },
  { id: "progress", Icon: TrendingUp, label: "Mi Avance" },
];

// ========================
// MAIN PATIENT APP
// ========================
function PatientApp() {
  const router = useRouter();
  const [patientId, setPatientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("analyze");

  useEffect(() => {
    const id = localStorage.getItem("nutriai_patient_id");
    if (!id) {
      router.push("/login");
    } else {
      setPatientId(id);
      setLoading(false);
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("nutriai_patient_id");
    localStorage.removeItem("nutriai_patient_name");
    router.push("/login");
  };

  if (loading || !patientId) {
    return (
      <div className="app-shell" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100dvh" }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="app-shell">
      {/* App Header */}
      <div className="app-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative", zIndex: 1 }}>
          <div>
            <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.7)", margin: "0 0 4px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              🌿 NutriAI
            </p>
            <h1 style={{ fontSize: "1.4rem", fontWeight: 700, color: "white", margin: 0 }}>
              {activeTab === "analyze" && "Registrar Comida"}
              {activeTab === "profile" && "Mi Perfil"}
              {activeTab === "progress" && "Mi Avance"}
            </h1>
            <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.75)", margin: "4px 0 0" }}>
              {activeTab === "analyze" && "Registra tu comida del día"}
              {activeTab === "profile" && "Datos para tu nutricionista"}
              {activeTab === "progress" && "Historial de tu transformación"}
            </p>
          </div>
          <div className="avatar" style={{ color: "#ffffff", border: "1px solid rgba(255,255,255,0.15)" }}>
            {activeTab === "analyze"
              ? <Utensils size={22} strokeWidth={2} />
              : activeTab === "profile"
                ? <UserRound size={22} strokeWidth={2} />
                : <TrendingUp size={22} strokeWidth={2} />}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="app-content">
        {activeTab === "analyze" && <TabAnalyze patientId={patientId} />}
        {activeTab === "profile" && <TabProfile patientId={patientId} onLogout={handleLogout} />}
        {activeTab === "progress" && <TabProgress patientId={patientId} />}
      </div>

      {/* Bottom Navigation Bar */}
      <nav className="bottom-nav">
        {NAV_ITEMS.map(item => {
          const Icon = item.Icon;
          return (
            <button
              key={item.id}
              className={`bottom-nav-item ${activeTab === item.id ? "active" : ""}`}
              onClick={() => setActiveTab(item.id)}
            >
              <span className="bottom-nav-icon"><Icon size={22} strokeWidth={2} /></span>
              <span className="bottom-nav-label">{item.label}</span>
              {activeTab === item.id && <span className="bottom-nav-indicator" />}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export default function PatientDashboard() {
  return (
    <Suspense fallback={
      <div className="app-shell" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100dvh" }}>
        <div className="spinner" />
      </div>
    }>
      <PatientApp />
    </Suspense>
  );
}
