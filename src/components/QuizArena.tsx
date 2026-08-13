import React, { useState, useEffect } from 'react';
import { Session, Submission, User } from '../types';
import { Clock, CheckCircle2, XCircle, AlertCircle, Sparkles, ArrowRight, ArrowLeft, Award, HelpCircle, FileCheck, RefreshCw, Lock } from 'lucide-react';

interface QuizArenaProps {
  session: Session;
  currentUser: User;
  onSubmitted: (submission: Submission) => void;
  onCancel: () => void;
}

export const QuizArena: React.FC<QuizArenaProps> = ({
  session,
  currentUser,
  onSubmitted,
  onCancel
}) => {
  const quiz = session.quiz;
  const questions = quiz?.questions || [];

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<number[]>(new Array(questions.length).fill(-1));
  const [timeLeft, setTimeLeft] = useState<number>(60 * 60); // 60 minutes countdown
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<Submission | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const cleanSessionDate = session.date ? session.date.split('T')[0] : todayStr;
  const isToday = cleanSessionDate === todayStr;
  const isFuture = cleanSessionDate > todayStr;

  // Countdown timer effect
  useEffect(() => {
    if (submissionResult) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [submissionResult]);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSelectChoice = (choiceIndex: number) => {
    const updated = [...userAnswers];
    updated[currentQuestionIndex] = choiceIndex;
    setUserAnswers(updated);
  };

  const handleSubmitQuiz = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/sessions/${session.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: currentUser.id,
          answers: userAnswers.map(a => a === -1 ? 0 : a)
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de la soumission du quiz.");
      }

      setSubmissionResult(data.submission);
      onSubmitted(data.submission);
    } catch (err: any) {
      setErrorMessage(err.message || "Impossible de soumettre le quiz.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Block quiz only if scheduled for a future date
  if (isFuture && !submissionResult) {
    return (
      <div className="bg-white border-2 border-slate-200 border-l-4 border-l-amber-500 rounded-2xl p-8 text-center space-y-4 shadow-md max-w-2xl mx-auto">
        <div className="w-16 h-16 bg-amber-50 rounded-2xl border border-amber-300 flex items-center justify-center mx-auto shadow-sm">
          <Lock className="w-8 h-8 text-amber-600" />
        </div>
        <h2 className="text-xl font-extrabold text-slate-900 uppercase tracking-tight flex items-center justify-center gap-2">
          Quiz Verrouillé (Date Non Atteinte)
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
          Ce quiz est programmé pour le <strong className="text-slate-900">{session.date}</strong>. Vous ne pouvez passer les quiz que le jour exact de leur programmation.
        </p>

        {/* Blurred Quiz Preview */}
        <div className="relative mt-4 p-6 bg-slate-50 border border-slate-200 rounded-2xl filter blur-sm select-none opacity-50 space-y-3">
          <div className="h-4 bg-slate-300 rounded w-3/4 mx-auto" />
          <div className="h-3 bg-slate-200 rounded w-1/2 mx-auto" />
          <div className="grid grid-cols-2 gap-2 mt-4">
            <div className="h-10 bg-slate-200 rounded" />
            <div className="h-10 bg-slate-200 rounded" />
          </div>
        </div>

        <div className="pt-4">
          <button
            onClick={onCancel}
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-2xl shadow-md transition-all cursor-pointer"
          >
            Retour au planning
          </button>
        </div>
      </div>
    );
  }

  if (!quiz || questions.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-4 shadow-md">
        <AlertCircle className="w-12 h-12 text-slate-900 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900 uppercase tracking-wider">Quiz non disponible</h2>
        <p className="text-sm text-slate-400">
          Aucun questionnaire n'a été généré pour cette session pour le moment.
        </p>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-2xl border border-slate-300 cursor-pointer"
        >
          Retour au planning
        </button>
      </div>
    );
  }

  // --- SUBMISSION RESULT REVIEW VIEW ---
  if (submissionResult) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        
        {/* Validation Result Header Card - Geometric Balance Style */}
        <div className={`p-8 rounded-2xl border-2 text-center relative overflow-hidden shadow-md ${
          submissionResult.isValidated
            ? 'bg-white border-emerald-500 border-l-8 border-l-emerald-500'
            : 'bg-white border-rose-500 border-l-8 border-l-rose-500'
        }`}>
          <div className="space-y-3 relative z-10">
            <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center text-3xl font-extrabold shadow-sm bg-white border border-slate-300">
              {submissionResult.isValidated ? '🎉' : '⚠️'}
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tight">
              {submissionResult.isValidated
                ? 'FÉLICITATIONS, MODULE VALIDÉ !'
                : 'MODULE NON VALIDÉ (SEUIL 6/10)'}
            </h2>

            <p className="text-sm text-slate-700">
              Session : <strong className="text-slate-900">{session.title}</strong>
            </p>

            {/* Score Breakdown Pills */}
            <div className="inline-flex flex-wrap items-center justify-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 mt-2">
              <div className="text-center px-3">
                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Note de base</div>
                <div className="text-lg font-bold text-slate-900">{submissionResult.baseScore} / 10</div>
              </div>
              <div className="text-xl font-bold text-slate-600">+</div>
              <div className="text-center px-3">
                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Bonus / Malus</div>
                <div className={`text-lg font-bold ${
                  submissionResult.adjustment >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {submissionResult.adjustment >= 0 ? `+${submissionResult.adjustment}` : submissionResult.adjustment} pts
                </div>
              </div>
              <div className="text-xl font-bold text-slate-600">=</div>
              <div className="text-center px-3">
                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Note Finale</div>
                <div className={`text-2xl font-black ${
                  submissionResult.isValidated ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {submissionResult.finalScore} / 10
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-400 max-w-xl mx-auto pt-2">
              {submissionResult.adjustment === 2 && "⚡ Bonus ponctualité accordé (+2 pts car soumis avant 16h00)." }
              {submissionResult.adjustment < 0 && `⚠️ Soumission tardive (${submissionResult.isLate ? submissionResult.lateDays + ' jour(s) de retard' : 'soumis après 16h00'}). Malus appliqué : ${submissionResult.adjustment} pts.` }
            </div>
          </div>
        </div>

        {/* Question Review Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-slate-900" />
            Correction détaillée du QCM (10 questions)
          </h3>

          {questions.map((q, idx) => {
            const userChoice = submissionResult.answers[idx];
            const isCorrect = userChoice === q.correctAnswer;

            return (
              <div
                key={q.id}
                className={`bg-white rounded-2xl p-5 border text-xs space-y-3 ${
                  isCorrect ? 'border-emerald-500/40 border-l-4 border-l-emerald-500' : 'border-rose-500/40 border-l-4 border-l-rose-500'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="font-bold text-slate-800 text-sm flex items-start gap-2">
                    <span className="bg-white text-slate-900 px-2 py-0.5 rounded-xl font-mono text-xs border border-slate-300">
                      Q{idx + 1}
                    </span>
                    <span>{q.question}</span>
                  </div>
                  {isCorrect ? (
                    <span className="flex items-center gap-1 text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/30 uppercase text-[10px] tracking-wider">
                      <CheckCircle2 className="w-4 h-4" /> Correct
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-rose-400 font-bold bg-rose-500/10 px-2.5 py-1 rounded-xl border border-rose-500/30 uppercase text-[10px] tracking-wider">
                      <XCircle className="w-4 h-4" /> Incorrect
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {q.choices.map((c, cIdx) => {
                    const isSelected = userChoice === cIdx;
                    const isAnswerKey = q.correctAnswer === cIdx;

                    let choiceStyle = "bg-white/60 border-slate-200 text-slate-400";
                    if (isAnswerKey) {
                      choiceStyle = "bg-emerald-500/15 border-emerald-500/50 text-emerald-200 font-bold";
                    } else if (isSelected && !isCorrect) {
                      choiceStyle = "bg-rose-500/15 border-rose-500/50 text-rose-200 line-through";
                    }

                    return (
                      <div
                        key={cIdx}
                        className={`p-3 rounded-2xl border flex items-center justify-between text-xs ${choiceStyle}`}
                      >
                        <span>{String.fromCharCode(65 + cIdx)}. {c}</span>
                        {isAnswerKey && <span className="text-[10px] text-emerald-400 font-mono font-bold uppercase">Bonne réponse</span>}
                        {isSelected && !isAnswerKey && <span className="text-[10px] text-rose-400 font-mono font-bold uppercase">Votre réponse</span>}
                      </div>
                    );
                  })}
                </div>

                {q.explanation && (
                  <div className="bg-white p-3 rounded-2xl border border-slate-200 text-slate-700 text-[11px] leading-relaxed">
                    <strong className="text-slate-900 font-bold uppercase">Explication : </strong>
                    {q.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-center pt-4">
          <button
            onClick={onCancel}
            className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-2xl shadow-md transition-all cursor-pointer"
          >
            Retourner au planning
          </button>
        </div>

      </div>
    );
  }

  // --- ACTIVE QUIZ TAKING VIEW ---
  const currentQ = questions[currentQuestionIndex];
  const selectedChoice = userAnswers[currentQuestionIndex];
  const answeredCount = userAnswers.filter(a => a !== -1).length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* Quiz Top Header & Timer Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-900 font-mono font-bold uppercase">
              <span>{session.moduleTitle}</span>
              <span>•</span>
              <span>Session {session.date}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight mt-1">
              {quiz.title}
            </h1>
          </div>

          {/* Countdown Timer */}
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-slate-900/50 text-slate-900 font-mono font-bold text-sm self-start sm:self-auto">
            <Clock className="w-4 h-4 animate-spin text-slate-900" />
            <span>Temps restant : {formatTimer(timeLeft)}</span>
          </div>
        </div>

        {/* Bonus / Malus Reminder Banner */}
        <div className="bg-slate-100 border border-slate-900/30 rounded-2xl p-3 text-xs text-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-slate-900 shrink-0" />
            <span>
              <strong>Rappel :</strong> Soumettez avant 16h00 pour empocher <strong>+2 points de bonus</strong> !
            </span>
          </div>
          <span className="font-mono text-[10px] uppercase font-bold bg-white px-2.5 py-1 rounded-xl border border-slate-900/40 text-slate-900">
            Passage unique
          </span>
        </div>

        {/* Question Navigator Dots */}
        <div className="flex items-center justify-between gap-1 overflow-x-auto pt-2">
          {questions.map((_, idx) => {
            const isAnswered = userAnswers[idx] !== -1;
            const isCurrent = currentQuestionIndex === idx;

            return (
              <button
                key={idx}
                onClick={() => setCurrentQuestionIndex(idx)}
                className={`w-8 h-8 rounded-xl font-bold font-mono text-xs transition-all cursor-pointer ${
                  isCurrent
                    ? 'bg-slate-900 text-white shadow-sm'
                    : isAnswered
                    ? 'bg-emerald-500/20 text-emerald-700 border border-emerald-500/40'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Question Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-md relative">
        <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-200 pb-4">
          <span className="font-bold font-mono text-slate-900 uppercase">
            QUESTION {currentQuestionIndex + 1} SUR {questions.length}
          </span>
          <span className="uppercase tracking-wider text-[11px]">
            {answeredCount} / {questions.length} répondues
          </span>
        </div>

        <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-relaxed uppercase tracking-tight">
          {currentQ.question}
        </h2>

        {/* Choices Options */}
        <div className="space-y-3">
          {currentQ.choices.map((choiceText, cIdx) => {
            const isSelected = selectedChoice === cIdx;

            return (
              <button
                key={cIdx}
                onClick={() => handleSelectChoice(cIdx)}
                className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center gap-4 cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 border-slate-900 text-white font-bold'
                    : 'bg-white/80 hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                <div className={`w-8 h-8 rounded-xl font-mono text-xs font-bold flex items-center justify-center shrink-0 transition-colors ${
                  isSelected ? 'bg-white text-slate-900' : 'bg-slate-100 text-slate-700'
                }`}>
                  {String.fromCharCode(65 + cIdx)}
                </div>
                <span className="text-sm leading-snug">{choiceText}</span>
              </button>
            );
          })}
        </div>

        {/* Motivational Prompt Footer */}
        <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-xs text-slate-400 font-medium">
            {answeredCount === questions.length ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1.5 uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4" />
                Toutes les questions sont répondues ! Vous pouvez soumettre.
              </span>
            ) : (
              <span>
                Plus que <strong className="text-slate-900">{questions.length - answeredCount}</strong> question(s) à compléter.
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
              disabled={currentQuestionIndex === 0}
              className="px-4 py-2 rounded-2xl bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider hover:bg-slate-700 hover:text-white disabled:opacity-50 border border-slate-300 cursor-pointer"
            >
              Précédent
            </button>

            {currentQuestionIndex < questions.length - 1 ? (
              <button
                onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
                className="px-5 py-2 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                Suivant
              </button>
            ) : (
              <button
                onClick={handleSubmitQuiz}
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider shadow-md flex items-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Calcul des notes...
                  </>
                ) : (
                  <>
                    <Award className="w-4 h-4" />
                    Soumettre le Quiz
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {errorMessage && (
          <div className="bg-rose-500/10 border-l-4 border-rose-500 p-3 rounded-2xl text-rose-300 text-xs font-semibold">
            {errorMessage}
          </div>
        )}

      </div>

    </div>
  );
};
