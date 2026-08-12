import React, { useState } from 'react';
import { Module, Session, Submission, User } from '../types';
import { BookOpen, Calendar, Clock, FileText, CheckCircle2, AlertTriangle, Play, Sparkles, ChevronRight, Award, Bell, Lock } from 'lucide-react';

interface StudentPlanningProps {
  modules: Module[];
  currentUser: User;
  studentSubmissions: Submission[];
  onStartQuiz: (session: Session) => void;
  onViewSubmissionDetail: (submission: Submission) => void;
}

export const StudentPlanning: React.FC<StudentPlanningProps> = ({
  modules,
  currentUser,
  studentSubmissions,
  onStartQuiz,
  onViewSubmissionDetail
}) => {
  const [selectedModuleId, setSelectedModuleId] = useState<string>('all');
  const [showPdfModal, setShowPdfModal] = useState<Session | null>(null);

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Flatten all sessions sorted by date
  const allSessions: { session: Session; module: Module }[] = [];
  modules.forEach(m => {
    m.sessions.forEach(s => {
      allSessions.push({ session: s, module: m });
    });
  });

  allSessions.sort((a, b) => a.session.date.localeCompare(b.session.date));

  const filteredSessions = selectedModuleId === 'all'
    ? allSessions
    : allSessions.filter(item => item.module.id === selectedModuleId);

  const getSubmissionForSession = (sessionId: string) => {
    return studentSubmissions.find(sub => sub.sessionId === sessionId);
  };

  return (
    <div className="space-y-6">
      
      {/* Hero Banner & Reminder - Geometric Balance Style */}
      <div className="bg-white border-2 border-slate-200 border-l-4 border-l-slate-900 rounded-2xl p-6 shadow-md relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-2xl bg-slate-100 text-slate-900 border border-slate-900/40 text-xs font-bold uppercase tracking-wider">
              <Bell className="w-3.5 h-3.5" />
              Rappel Automatique • Horaires Quiz
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 uppercase tracking-tight">
              Planning des Quiz « Team Diplôme »
            </h1>
            <p className="text-sm text-slate-700 max-w-2xl leading-relaxed">
              Consultez vos cours PDF, respectez le créneau quotidien de <strong className="text-slate-900">15h00 – 16h00</strong> et cumulez le <strong className="text-emerald-400">bonus de +2 points</strong> à chaque soumission ponctuelle.
            </p>
          </div>

          {/* Quick Stats Widget */}
          <div className="flex items-center gap-4 bg-white/90 p-4 rounded-2xl border border-slate-300 self-start md:self-auto">
            <div className="text-center px-2">
              <div className="text-xl font-extrabold text-slate-900">
                {studentSubmissions.length} / {allSessions.length}
              </div>
              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Quiz Remplis</div>
            </div>
            <div className="w-px h-8 bg-slate-700" />
            <div className="text-center px-2">
              <div className="text-xl font-extrabold text-emerald-400">
                {studentSubmissions.filter(s => s.isValidated).length}
              </div>
              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Modules Validés</div>
            </div>
          </div>
        </div>

        {/* Bonus / Malus Rules Summary Strip */}
        <div className="mt-6 pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="flex items-center gap-2 text-emerald-300 bg-emerald-500/10 px-3 py-2 rounded-2xl border border-emerald-500/30 font-semibold">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span><strong>Bonus +2 pts</strong> : Soumission avant 16h00 le jour J</span>
          </div>
          <div className="flex items-center gap-2 text-slate-800 bg-slate-100 px-3 py-2 rounded-2xl border border-slate-200 font-semibold">
            <AlertTriangle className="w-4 h-4 shrink-0 text-slate-900" />
            <span><strong>Malus -1 pt</strong> : Soumission le jour J après 16h00</span>
          </div>
          <div className="flex items-center gap-2 text-rose-300 bg-rose-500/10 px-3 py-2 rounded-2xl border border-rose-500/30 font-semibold">
            <Clock className="w-4 h-4 shrink-0 text-rose-400" />
            <span><strong>Malus additionnel</strong> : -1 pt / jour calendaire de retard</span>
          </div>
        </div>
      </div>

      {/* Module Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedModuleId('all')}
          className={`px-4 py-2 rounded-2xl text-xs uppercase tracking-wider font-bold transition-all whitespace-nowrap cursor-pointer ${
            selectedModuleId === 'all'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-900 hover:text-white border border-slate-300'
          }`}
        >
          Tous les modules ({allSessions.length} sessions)
        </button>

        {modules.map(mod => (
          <button
            key={mod.id}
            onClick={() => setSelectedModuleId(mod.id)}
            className={`px-4 py-2 rounded-2xl text-xs uppercase tracking-wider font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              selectedModuleId === mod.id
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-900 hover:text-white border border-slate-300'
            }`}
          >
            <span className="text-[10px] opacity-75 font-mono">{mod.code}</span>
            <span>{mod.title}</span>
          </button>
        ))}
      </div>

      {/* Sessions Timeline List */}
      <div className="space-y-4">
        {filteredSessions.length === 0 && (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center space-y-3">
            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">Aucune session de cours programmée</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Aucun module ou cours n'a été créé pour le moment. L'administrateur peut ajouter de nouveaux modules et générer des quiz depuis l'espace d'administration.
            </p>
          </div>
        )}

        {filteredSessions.map(({ session, module }) => {
          const submission = getSubmissionForSession(session.id);
          const [year, month, day] = session.date.split('-');
          const formattedDate = `${day}/${month}/${year}`;
          const isToday = session.date === todayStr;

          return (
            <div
              key={session.id}
              className={`bg-white rounded-2xl border transition-all p-5 ${
                submission
                  ? 'border-emerald-500/50 border-l-4 border-l-emerald-500'
                  : !isToday
                  ? 'border-amber-300/80 border-l-4 border-l-amber-500 bg-slate-50/50'
                  : session.isQuizReady
                  ? 'border-slate-900/60 border-l-4 border-l-slate-900'
                  : 'border-slate-200 border-l-4 border-l-slate-700'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                
                {/* Left info */}
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-1 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono text-xs font-bold">
                      {module.code}
                    </span>
                    <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-xl border ${
                      isToday ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-extrabold' : 'bg-white/80 text-slate-700 border-slate-200'
                    }`}>
                      <Calendar className="w-3.5 h-3.5 text-slate-900" />
                      {formattedDate} {isToday && '• Aujourd\'hui'}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold bg-white/80 px-2.5 py-1 rounded-xl border border-slate-200">
                      <Clock className="w-3.5 h-3.5 text-slate-900" />
                      {session.startTime} - {session.endTime}
                    </span>

                    {submission ? (
                      <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1 uppercase tracking-wider">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        Quiz Déjà Soumis
                      </span>
                    ) : !isToday ? (
                      <span className="px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-300 text-xs font-bold flex items-center gap-1.5 uppercase tracking-wider">
                        <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Vérouillé (Prévu le {formattedDate})</span>
                      </span>
                    ) : session.isQuizReady ? (
                      <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-800 border border-slate-900/40 text-xs font-bold uppercase tracking-wider animate-pulse">
                        Quiz Ouvert (Prêt)
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-400 text-xs font-medium uppercase tracking-wider">
                        En préparation
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tight">
                      {session.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5 font-medium">
                      {module.title}
                    </p>
                  </div>
                </div>

                {/* Right Actions & Grade Summary */}
                <div className="flex flex-wrap items-center gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-200">
                  
                  {/* View Course PDF Button */}
                  {session.pdfFileName && (
                    <button
                      onClick={() => setShowPdfModal(session)}
                      className="px-3.5 py-2 rounded-2xl bg-slate-100 hover:bg-slate-700 text-slate-800 hover:text-white border border-slate-300 text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <FileText className="w-4 h-4 text-slate-900" />
                      Cours PDF
                    </button>
                  )}

                  {/* Submission Result OR Start Quiz Button */}
                  {submission ? (
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-sm font-extrabold text-slate-900 flex items-center justify-end gap-1">
                          <span className={submission.isValidated ? 'text-emerald-400' : 'text-rose-400'}>
                            {submission.finalScore} / 10
                          </span>
                          <span className="text-[11px] font-normal text-slate-400">
                            ({submission.adjustment >= 0 ? `+${submission.adjustment}` : submission.adjustment} adj.)
                          </span>
                        </div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {submission.isValidated ? '✓ Validé (≥ 6)' : '✗ Non validé'}
                        </div>
                      </div>

                      <button
                        onClick={() => onViewSubmissionDetail(submission)}
                        className="px-3.5 py-2 rounded-2xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        Détail
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  ) : !isToday ? (
                    <div className="relative flex items-center gap-2">
                      <button
                        disabled
                        className="px-5 py-2 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm bg-slate-100 text-slate-400 border border-slate-300 cursor-not-allowed filter blur-[2px] opacity-60 select-none"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        <span>Passer le Quiz</span>
                      </button>
                      <span className="flex items-center gap-1 text-[11px] font-black uppercase text-slate-800 bg-amber-100 px-2.5 py-1 rounded-xl shadow-sm border border-amber-300">
                        <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Vérouillé</span>
                      </span>
                    </div>
                  ) : (
                    <button
                      onClick={() => onStartQuiz(session)}
                      disabled={!session.isQuizReady}
                      className={`px-5 py-2 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all ${
                        session.isQuizReady
                          ? 'bg-slate-900 text-white hover:bg-slate-800 active:scale-95 cursor-pointer'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-300'
                      }`}
                    >
                      <Play className="w-4 h-4 fill-current text-white" />
                      {session.isQuizReady ? 'Passer le Quiz' : 'Quiz non prêt'}
                    </button>
                  )}

                </div>

              </div>
            </div>
          );
        })}
      </div>

      {/* PDF View Modal */}
      {showPdfModal && (
        <div className="fixed inset-0 bg-slate-50/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-900 flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{showPdfModal.pdfFileName}</h3>
                  <p className="text-xs text-slate-400">{showPdfModal.title}</p>
                </div>
              </div>
              <button
                onClick={() => setShowPdfModal(null)}
                className="text-slate-400 hover:text-slate-900 text-lg font-bold p-2"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 font-mono text-xs text-slate-700 leading-relaxed max-h-96 overflow-y-auto whitespace-pre-wrap">
              {showPdfModal.pdfTextSnippet || "Aperçu du cours non disponible pour cette session."}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowPdfModal(null)}
                className="px-5 py-2 rounded-xl bg-slate-100 text-slate-900 font-semibold text-xs hover:bg-slate-700"
              >
                Fermer la lecture
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
