import React, { useState } from 'react';
import { Module, Session } from '../types';
import { Plus, Sparkles, FileText, Upload, RefreshCw, CheckCircle2, AlertCircle, BookOpen, Clock, Calendar } from 'lucide-react';

interface AdminModuleManagementProps {
  modules: Module[];
  onRefresh: () => void;
}

export const AdminModuleManagement: React.FC<AdminModuleManagementProps> = ({
  modules,
  onRefresh
}) => {
  // New Module Form State
  const [newModuleCode, setNewModuleCode] = useState('');
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [newModuleDesc, setNewModuleDesc] = useState('');
  const [isCreatingModule, setIsCreatingModule] = useState(false);

  // New Session Form State
  const [selectedModuleId, setSelectedModuleId] = useState<string>(modules[0]?.id || '');
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionDate, setSessionDate] = useState('2026-08-18');
  const [sessionStartTime, setSessionStartTime] = useState('15:00');
  const [sessionEndTime, setSessionEndTime] = useState('16:00');
  const [pdfFileName, setPdfFileName] = useState('');
  const [courseText, setCourseText] = useState('');
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  // AI Quiz Generation Loading State
  const [generatingSessionId, setGeneratingSessionId] = useState<string | null>(null);
  const [aiTextInputs, setAiTextInputs] = useState<Record<string, string>>({});

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModuleTitle) return;

    setIsCreatingModule(true);
    setMessage(null);

    try {
      const res = await fetch('/api/modules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newModuleCode || `MOD-${100 + modules.length + 1}`,
          title: newModuleTitle,
          description: newModuleDesc
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de la création du module.");

      setMessage({ type: 'success', text: `Module "${data.title}" créé avec succès !` });
      setNewModuleCode('');
      setNewModuleTitle('');
      setNewModuleDesc('');
      onRefresh();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsCreatingModule(false);
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModuleId || !sessionTitle || !sessionDate) return;

    setIsCreatingSession(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/modules/${selectedModuleId}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: sessionTitle,
          date: sessionDate,
          startTime: sessionStartTime,
          endTime: sessionEndTime,
          pdfFileName: pdfFileName || `Cours_${sessionTitle.replace(/\s+/g, '_')}.pdf`,
          pdfTextSnippet: courseText
        })
      });

      const sessionData = await res.json();
      if (!res.ok) throw new Error(sessionData.error || "Erreur lors de la création de la session.");

      // If course text was provided, automatically trigger AI Quiz Generation!
      if (courseText.trim().length >= 20) {
        setGeneratingSessionId(sessionData.id);
        const aiRes = await fetch(`/api/sessions/${sessionData.id}/generate-quiz`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ courseText })
        });
        const aiData = await aiRes.json();
        if (!aiRes.ok) throw new Error(aiData.error || "Erreur lors de la génération IA du quiz.");

        setMessage({ type: 'success', text: `Session et Quiz QCM 10 questions générés avec succès via Gemini IA !` });
      } else {
        setMessage({ type: 'success', text: `Session "${sessionData.title}" créée. Vous pourrez générer le quiz plus tard.` });
      }

      setSessionTitle('');
      setCourseText('');
      setPdfFileName('');
      onRefresh();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsCreatingSession(false);
      setGeneratingSessionId(null);
    }
  };

  const handleGenerateQuizForExisting = async (session: Session) => {
    const textToUse = aiTextInputs[session.id] || session.pdfTextSnippet || "";
    if (textToUse.trim().length < 20) {
      alert("Veuillez coller le texte du cours (au moins 20 caractères) pour générer le quiz QCM.");
      return;
    }

    setGeneratingSessionId(session.id);
    setMessage(null);

    try {
      const res = await fetch(`/api/sessions/${session.id}/generate-quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseText: textToUse })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de la génération IA.");

      setMessage({ type: 'success', text: `Quiz QCM 10 questions régénéré avec succès pour "${session.title}" !` });
      onRefresh();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setGeneratingSessionId(null);
    }
  };

  // Sample course text presets for quick testing
  const fillSampleCourseText = (topic: string) => {
    if (topic === 'ri') {
      setSessionTitle("Jour 1 - Théories des Relations Internationales & Anarchie");
      setCourseText("Le réalisme politique considère l'État souverain comme l'acteur central du système international anarchique. Selon Hans Morgenthau et Kenneth Waltz, la quête de puissance et la sécurité nationale guident la diplomatie. Le dilemme de sécurité de John Herz montre comment l'armement d'un État effraie ses voisins. En opposition, le libéralisme met en avant l'interdépendance complexe, le droit international, les organisations supranationales et la démocratie comme vecteurs de paix.");
      setPdfFileName("Cours_Complet_Theorie_RI.pdf");
    } else if (topic === 'droit') {
      setSessionTitle("Jour 1 - Contentieux des Marchés Publics & Responsabilité");
      setCourseText("Les marchés publics sont des contrats administratifs conclues à titre onéreux entre un acheteur public et un opérateur économique. Ils obéissent aux principes de liberté d'accès, d'égalité de traitement et de transparence. La responsabilité contractuelle de l'Administration requiert la preuve d'un manquement et d'un préjudice direct et certain.");
      setPdfFileName("Manuel_Marchés_Publics_2026.pdf");
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      
      {/* Top Banner - Geometric Balance Style */}
      <div className="bg-white border-2 border-slate-200 border-l-4 border-l-slate-900 rounded-2xl p-6 shadow-md space-y-2">
        <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-slate-900" />
          Gestion des Modules & Générateur de Quiz IA
        </h1>
        <p className="text-xs text-slate-700 font-medium">
          Uploadez ou collez le cours PDF de votre session pour déclencher la <strong className="text-slate-900">génération automatique de 10 questions QCM</strong> structurées via l'API Google Gemini.
        </p>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-2 ${
          message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
          {message.text}
        </div>
      )}

      {/* Grid: Create Module + Create Session */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Form 1: Add New Module */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-md space-y-4">
          <h2 className="text-base font-bold text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-slate-900" />
            1. Créer un Nouveau Module
          </h2>

          <form onSubmit={handleCreateModule} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-1">Code du module</label>
              <input
                type="text"
                placeholder="ex: MOD-107"
                value={newModuleCode}
                onChange={(e) => setNewModuleCode(e.target.value)}
                className="w-full px-3.5 py-2 rounded-2xl bg-white border border-slate-300 text-slate-900 font-mono focus:border-slate-900 outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-1">Titre complet du module *</label>
              <input
                type="text"
                required
                placeholder="ex: Droit des Organisations Supranationales"
                value={newModuleTitle}
                onChange={(e) => setNewModuleTitle(e.target.value)}
                className="w-full px-3.5 py-2 rounded-2xl bg-white border border-slate-300 text-slate-900 focus:border-slate-900 outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-1">Description pédagogique</label>
              <textarea
                rows={2}
                placeholder="Brève description des objectifs de ce module..."
                value={newModuleDesc}
                onChange={(e) => setNewModuleDesc(e.target.value)}
                className="w-full px-3.5 py-2 rounded-2xl bg-white border border-slate-300 text-slate-900 focus:border-slate-900 outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isCreatingModule}
              className="w-full py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold uppercase tracking-wider border border-slate-300 flex items-center justify-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              Créer le Module
            </button>
          </form>
        </div>

        {/* Form 2: Add Session & AI Quiz Generation */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-slate-900" />
              2. Créer une Session & Quiz IA
            </h2>

            <div className="flex gap-1 text-[10px]">
              <button
                type="button"
                onClick={() => fillSampleCourseText('ri')}
                className="px-2 py-1 bg-slate-100 text-slate-900 border border-slate-900/30 rounded-xl font-bold uppercase tracking-wider hover:bg-slate-100"
              >
                + Exemple RI
              </button>
              <button
                type="button"
                onClick={() => fillSampleCourseText('droit')}
                className="px-2 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 rounded-xl font-bold uppercase tracking-wider hover:bg-indigo-500/20"
              >
                + Exemple Droit
              </button>
            </div>
          </div>

          <form onSubmit={handleCreateSession} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-1">Module rattaché *</label>
              <select
                value={selectedModuleId}
                onChange={(e) => setSelectedModuleId(e.target.value)}
                className="w-full px-3.5 py-2 rounded-2xl bg-white border border-slate-300 text-slate-900 focus:border-slate-900 outline-none"
              >
                {modules.map(m => (
                  <option key={m.id} value={m.id}>
                    [{m.code}] {m.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-1">Titre Session *</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Jour 1 - Extranéité"
                  value={sessionTitle}
                  onChange={(e) => setSessionTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-2xl bg-white border border-slate-300 text-slate-900 focus:border-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-1">Date Quiz *</label>
                <input
                  type="date"
                  required
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-2xl bg-white border border-slate-300 text-slate-900 focus:border-slate-900 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-1">Texte cours PDF (Extrait QCM) *</label>
              <textarea
                rows={4}
                required
                placeholder="Collez le texte du cours extrait du PDF ici. Gemini générera 10 QCM automatiquement..."
                value={courseText}
                onChange={(e) => setCourseText(e.target.value)}
                className="w-full px-3.5 py-2 rounded-2xl bg-white border border-slate-300 text-slate-900 font-mono text-[11px] focus:border-slate-900 outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isCreatingSession || generatingSessionId !== null}
              className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-[#0f172a] font-black text-xs uppercase tracking-wider shadow-md flex items-center justify-center gap-2 transition-all"
            >
              {generatingSessionId !== null ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Génération QCM par Gemini IA...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Créer Session & Générer Quiz IA
                </>
              )}
            </button>
          </form>
        </div>

      </div>

      {/* Existing Sessions Overview & AI Regenerate */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-md space-y-4">
        <h2 className="text-lg font-bold text-slate-900 uppercase tracking-tight flex items-center gap-2">
          <FileText className="w-5 h-5 text-slate-900" />
          Sessions Existantes & Statut des Quiz
        </h2>

        <div className="space-y-3">
          {modules.map(mod => (
            <div key={mod.id} className="border border-slate-200 rounded-2xl p-4 bg-white space-y-3 border-l-4 border-l-slate-900">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-xl border border-slate-900/30">
                    {mod.code}
                  </span>
                  <span className="font-bold text-slate-900 text-sm uppercase tracking-tight">{mod.title}</span>
                </div>
                <span className="text-xs text-slate-400 font-medium">{mod.sessions.length} session(s)</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {mod.sessions.map(sess => (
                  <div key={sess.id} className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{sess.title}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{sess.date}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">
                        {sess.quiz ? `10 questions chargées` : `Aucun quiz`}
                      </span>

                      {sess.isQuizReady ? (
                        <span className="text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1 text-[10px]">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Prêt
                        </span>
                      ) : (
                        <span className="text-slate-900 font-bold uppercase tracking-wider text-[10px]">En attente</span>
                      )}
                    </div>

                    {/* Quick AI Regenerate Box */}
                    <div className="pt-2 border-t border-slate-200 space-y-2">
                      <textarea
                        rows={2}
                        placeholder="Coller du nouveau texte de cours pour régénérer le quiz..."
                        value={aiTextInputs[sess.id] || sess.pdfTextSnippet || ''}
                        onChange={(e) => setAiTextInputs({ ...aiTextInputs, [sess.id]: e.target.value })}
                        className="w-full p-2 bg-white rounded-2xl border border-slate-200 text-slate-700 text-[10px] font-mono outline-none focus:border-slate-900"
                      />

                      <button
                        onClick={() => handleGenerateQuizForExisting(sess)}
                        disabled={generatingSessionId === sess.id}
                        className="w-full py-1.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] uppercase tracking-wider border border-slate-300 flex items-center justify-center gap-1.5 transition-colors"
                      >
                        {generatingSessionId === sess.id ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-900" />
                            Génération IA...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5 text-slate-900" />
                            Régénérer Quiz QCM
                          </>
                        )}
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

      </div>

    </div>
  );
};
