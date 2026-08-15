import React from 'react';
import { Submission, User } from '../types';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Award, CheckCircle2, Clock, TrendingUp, ChevronRight, FileText, Sparkles, BarChart3 } from 'lucide-react';

interface StudentDashboardProps {
  currentUser: User | null;
  submissions: Submission[];
  onViewSubmissionDetail: (sub: Submission) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  currentUser,
  submissions,
  onViewSubmissionDetail
}) => {
  const userName = currentUser?.name || currentUser?.email || 'Étudiant';
  const userEmail = currentUser?.email || '';
  const userAvatar = currentUser?.avatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200';
  const totalSubmissions = submissions.length;
  const validatedCount = submissions.filter(s => s.isValidated).length;
  const passRate = totalSubmissions > 0 ? ((validatedCount / totalSubmissions) * 100).toFixed(0) : '0';

  const avgFinalScore = totalSubmissions > 0
    ? (submissions.reduce((acc, s) => acc + s.finalScore, 0) / totalSubmissions).toFixed(2)
    : '0.00';

  const avgBaseScore = totalSubmissions > 0
    ? (submissions.reduce((acc, s) => acc + s.baseScore, 0) / totalSubmissions).toFixed(2)
    : '0.00';

  const onTimeCount = submissions.filter(s => !s.isLate).length;
  const onTimeRate = totalSubmissions > 0 ? ((onTimeCount / totalSubmissions) * 100).toFixed(0) : '100';

  // Prepare chart data
  const chartData = submissions.map((sub, idx) => ({
    name: sub.sessionDate.split('-').slice(1).join('/'),
    sessionTitle: sub.sessionTitle,
    finalScore: sub.finalScore,
    baseScore: sub.baseScore,
    adjustment: sub.adjustment
  }));

  return (
    <div className="space-y-6">
      
      {/* Student Welcome Header - Geometric Balance Style */}
      <div className="bg-white border-2 border-slate-200 border-l-4 border-l-slate-900 rounded-2xl p-6 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <img
            src={userAvatar}
            alt={userName}
            className="w-16 h-16 rounded-2xl border-2 border-slate-900 object-cover shadow-sm"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{userName}</h1>
              <span className="bg-slate-100 text-slate-900 border border-slate-900/40 text-xs px-2.5 py-0.5 rounded-xl font-bold uppercase tracking-wider">
                Espace Étudiant
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">
              {userEmail} • Suivi individuel des performances et ajustements horaire
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-white p-3 rounded-2xl border border-slate-200 self-stretch md:self-auto justify-around">
          <div className="text-center px-3">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Statut Réussite</div>
            <div className="text-base font-extrabold text-emerald-400 mt-0.5 uppercase tracking-wide">
              {Number(avgFinalScore) >= 6 ? 'Moyenne Validée' : 'En progression'}
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid - Geometric Balance */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-1 border-t-2 border-t-slate-900">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Quiz Passés</span>
            <Award className="w-4 h-4 text-slate-900" />
          </div>
          <div className="text-2xl font-black text-slate-900">{totalSubmissions}</div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">
            Sessions réalisées
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-1 border-t-2 border-t-slate-900">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Moyenne Finale</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-slate-900">{avgFinalScore} <span className="text-xs font-normal text-slate-400">/ 10</span></div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">
            Base : {avgBaseScore} / 10
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-1 border-t-2 border-t-slate-900">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Taux de Validation</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">{passRate}%</div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">
            {validatedCount} sur {totalSubmissions} (seuil ≥ 6)
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-1 border-t-2 border-t-slate-900">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Ponctualité (+2)</span>
            <Clock className="w-4 h-4 text-slate-900" />
          </div>
          <div className="text-2xl font-black text-slate-800">{onTimeRate}%</div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">
            {onTimeCount} soumission(s) ≤ 16h00
          </div>
        </div>

      </div>

      {/* Evolution Chart over Time */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-md space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-slate-900" />
              Évolution Personnelle des Notes
            </h2>
            <p className="text-xs text-slate-400">
              Trajectoire de la note finale (incluant bonus/malus horaire) au fil des sessions
            </p>
          </div>
        </div>

        {chartData.length > 0 ? (
          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis domain={[0, 12]} stroke="#94a3b8" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#b8860b',
                    borderRadius: '0.25rem',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="finalScore"
                  name="Note Finale"
                  stroke="#b8860b"
                  strokeWidth={3}
                  dot={{ r: 5, fill: '#b8860b' }}
                  activeDot={{ r: 8 }}
                />
                <Line
                  type="monotone"
                  dataKey="baseScore"
                  name="Note de Base"
                  stroke="#64748b"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-400 text-xs font-medium uppercase tracking-wider">
            Aucun quiz soumis pour le moment. Votre courbe apparaîtra dès votre première participation !
          </div>
        )}
      </div>

      {/* History Submissions Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-md space-y-4">
        <h2 className="text-lg font-bold text-slate-900 uppercase tracking-tight flex items-center gap-2">
          <FileText className="w-5 h-5 text-slate-900" />
          Historique Chronologique des Soumissions
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px] bg-white/50">
                <th className="py-2.5 px-3">Session & Module</th>
                <th className="py-2.5 px-3">Date Session</th>
                <th className="py-2.5 px-3 text-center">Note Base</th>
                <th className="py-2.5 px-3 text-center">Ajustement</th>
                <th className="py-2.5 px-3 text-center">Note Finale</th>
                <th className="py-2.5 px-3 text-center">Statut</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {submissions.map(sub => (
                <tr key={sub.id} className="hover:bg-slate-100/50 transition-colors">
                  <td className="py-3 px-3">
                    <div className="font-bold text-slate-900 uppercase">{sub.sessionTitle}</div>
                    <div className="text-[10px] text-slate-400">{sub.moduleTitle}</div>
                  </td>
                  <td className="py-3 px-3 text-slate-700 font-mono">
                    {sub.sessionDate}
                  </td>
                  <td className="py-3 px-3 text-center font-bold text-slate-800">
                    {sub.baseScore} / 10
                  </td>
                  <td className="py-3 px-3 text-center font-bold">
                    <span className={sub.adjustment >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      {sub.adjustment >= 0 ? `+${sub.adjustment}` : sub.adjustment} pts
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center font-extrabold text-sm">
                    <span className={sub.isValidated ? 'text-emerald-400' : 'text-rose-400'}>
                      {sub.finalScore} / 10
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    {sub.isValidated ? (
                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-xl font-bold text-[10px] uppercase tracking-wider">
                        VALIDÉ
                      </span>
                    ) : (
                      <span className="bg-rose-500/10 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-xl font-bold text-[10px] uppercase tracking-wider">
                        NON VALIDÉ
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => onViewSubmissionDetail(sub)}
                      className="px-2.5 py-1.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] uppercase tracking-wider inline-flex items-center gap-1 border border-slate-300"
                    >
                      Détails
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
