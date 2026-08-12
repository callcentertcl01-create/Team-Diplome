import React, { useState } from 'react';
import { AdminAnalytics, StudentProgress, Module } from '../types';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { LayoutDashboard, Users, Award, TrendingUp, TrendingDown, Clock, Download, RefreshCw, ChevronRight, Search, AlertTriangle, CheckCircle2, ShieldCheck, Sparkles, Filter, X } from 'lucide-react';

interface AdminDashboardProps {
  analytics: AdminAnalytics | null;
  modules: Module[];
  onRefresh: () => void;
  onOpenModuleManagement: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  analytics,
  modules,
  onRefresh,
  onOpenModuleManagement
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentProgress | null>(null);
  const [studentModuleFilter, setStudentModuleFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'modules' | 'punctuality'>('overview');

  if (!analytics) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-4 shadow-md">
        <RefreshCw className="w-10 h-10 text-slate-900 animate-spin mx-auto" />
        <p className="text-sm font-bold text-slate-700 uppercase tracking-wider">Chargement des données du dashboard administrateur...</p>
      </div>
    );
  }

  const filteredStudents = analytics.studentProgressList.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pieData = [
    { name: 'À Temps (+2 Bonus)', value: Math.round((analytics.onTimePercentage / 100) * analytics.totalSubmissions), color: '#10b981' },
    { name: 'En Retard (Malus)', value: analytics.totalSubmissions - Math.round((analytics.onTimePercentage / 100) * analytics.totalSubmissions), color: '#f43f5e' }
  ];

  return (
    <div className="space-y-6">
      
      {/* Admin Executive Header - Geometric Balance Style */}
      <div className="bg-white border-2 border-slate-200 border-l-4 border-l-slate-900 rounded-2xl p-6 shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-2xl bg-slate-100 text-slate-900 border border-slate-900/40 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-slate-900" />
            Supervision Pédagogique & Analytics
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 uppercase tracking-tight">
            Dashboard Administrateur – Suivi Évolutif
          </h1>
          <p className="text-xs text-slate-700 uppercase tracking-wider font-medium">
            Analyse globale et individuelle de la promotion « Team Diplôme » (11–25 Août 2026)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onRefresh}
            className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-700 text-slate-800 border border-slate-300 text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all"
          >
            <RefreshCw className="w-4 h-4 text-slate-900" />
            Actualiser
          </button>

          <a
            href="/api/admin/export-csv"
            download="team_diplome_resultats.csv"
            className="px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-[#0f172a] text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-sm"
          >
            <Download className="w-4 h-4" />
            Exporter Résultats CSV
          </a>

          <button
            onClick={onOpenModuleManagement}
            className="px-4 py-2.5 rounded-2xl bg-slate-100 border border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-[#0f172a] text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-sm"
          >
            <Sparkles className="w-4 h-4" />
            Nouveau Module / Quiz IA
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-1 border-t-2 border-t-slate-900">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Étudiants Inscrits</span>
            <Users className="w-4 h-4 text-slate-900" />
          </div>
          <div className="text-2xl font-black text-slate-900">{analytics.totalStudents}</div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">
            {analytics.totalSubmissions} soumissions
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-1 border-t-2 border-t-slate-900">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Moyenne Générale</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-slate-900">{analytics.globalAverageScore} <span className="text-xs font-normal text-slate-400">/ 10</span></div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">
            Note finale globale
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-1 border-t-2 border-t-slate-900">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Taux Réussite</span>
            <Award className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">{analytics.globalPassRate}%</div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">
            Quiz validés (≥ 6/10)
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-1 border-t-2 border-t-slate-900">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Ponctualité (+2)</span>
            <Clock className="w-4 h-4 text-slate-900" />
          </div>
          <div className="text-2xl font-black text-slate-800">{analytics.onTimePercentage}%</div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">
            Soumissions ≤ 16h00
          </div>
        </div>

      </div>

      {/* Internal Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-2xl text-xs uppercase tracking-wider font-bold transition-all whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-slate-900 text-[#0f172a]'
              : 'bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-300'
          }`}
        >
          Graphiques Temporels
        </button>
        <button
          onClick={() => setActiveTab('students')}
          className={`px-4 py-2 rounded-2xl text-xs uppercase tracking-wider font-bold transition-all whitespace-nowrap ${
            activeTab === 'students'
              ? 'bg-slate-900 text-[#0f172a]'
              : 'bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-300'
          }`}
        >
          Classement Étudiants ({analytics.studentProgressList.length})
        </button>
        <button
          onClick={() => setActiveTab('modules')}
          className={`px-4 py-2 rounded-2xl text-xs uppercase tracking-wider font-bold transition-all whitespace-nowrap ${
            activeTab === 'modules'
              ? 'bg-slate-900 text-[#0f172a]'
              : 'bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-300'
          }`}
        >
          Aperçu Modules ({analytics.moduleStats.length})
        </button>
        <button
          onClick={() => setActiveTab('punctuality')}
          className={`px-4 py-2 rounded-2xl text-xs uppercase tracking-wider font-bold transition-all whitespace-nowrap ${
            activeTab === 'punctuality'
              ? 'bg-slate-900 text-[#0f172a]'
              : 'bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-300'
          }`}
        >
          Alertes & Ponctualité
        </button>
      </div>

      {/* TAB 1: TEMPORAL EVOLUTION CHARTS */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Average Final Score Trajectory */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-md space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 uppercase tracking-tight flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-slate-900" />
                Évolution de la Moyenne des Notes (11–25 Août)
              </h2>
              <p className="text-xs text-slate-400">
                Performance moyenne de la promotion par jour de session
              </p>
            </div>

            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.dailyScores}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                  <YAxis domain={[0, 10]} stroke="#94a3b8" fontSize={12} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.25rem', color: '#fff', fontSize: '12px' }}
                  />
                  <Line type="monotone" dataKey="avgScore" name="Moyenne /10" stroke="#b8860b" strokeWidth={3} dot={{ r: 5, fill: '#b8860b' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pass Rate Trajectory */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-md space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 uppercase tracking-tight flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-400" />
                Évolution du Taux de Réussite (%)
              </h2>
              <p className="text-xs text-slate-400">
                Pourcentage d'étudiants ayant obtenu ≥ 6/10 par jour
              </p>
            </div>

            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.dailyScores}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                  <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={12} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.25rem', color: '#fff', fontSize: '12px' }}
                  />
                  <Bar dataKey="passRate" name="Taux Réussite %" fill="#10b981" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: INDIVIDUAL STUDENTS ROSTER & LEADERBOARD */}
      {activeTab === 'students' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 uppercase tracking-tight flex items-center gap-2">
                <Users className="w-5 h-5 text-slate-900" />
                Suivi Individuel & Classement
              </h2>
              <p className="text-xs text-slate-400">
                Cliquez sur un étudiant pour ouvrir son bilan chronologique complet
              </p>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Rechercher par nom ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-2xl text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-slate-900 w-full sm:w-64"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b-2 border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px] bg-white">
                  <th className="py-3 px-3">Rang</th>
                  <th className="py-3 px-3">Étudiant</th>
                  <th className="py-3 px-3 text-center">Quiz Complétés</th>
                  <th className="py-3 px-3 text-center">Modules Validés</th>
                  <th className="py-3 px-3 text-center">Moyenne Finale</th>
                  <th className="py-3 px-3 text-center">Moyenne de Base</th>
                  <th className="py-3 px-3 text-center">Tendance</th>
                  <th className="py-3 px-3 text-right">Fiche Détaillée</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((st, idx) => (
                  <tr key={st.studentId} className="hover:bg-slate-100/50 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-slate-900 text-center w-12">
                      #{idx + 1}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{st.name}</div>
                      <div className="text-[10px] text-slate-400">{st.email}</div>
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-800">
                      {st.totalQuizzes}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-emerald-400">
                      {st.validatedModulesCount}
                    </td>
                    <td className="py-3 px-3 text-center font-extrabold text-sm">
                      <span className={st.averageScore >= 6 ? 'text-emerald-400' : 'text-rose-400'}>
                        {st.averageScore} / 10
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center text-slate-400 font-mono">
                      {st.baseAverageScore}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {st.trend === 'up' && <span className="text-emerald-400 font-bold flex items-center justify-center gap-1">↗️ Hausse</span>}
                      {st.trend === 'down' && <span className="text-rose-400 font-bold flex items-center justify-center gap-1">↘️ Baisse</span>}
                      {st.trend === 'stable' && <span className="text-slate-400 font-bold flex items-center justify-center gap-1">➡️ Stable</span>}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => setSelectedStudent(st)}
                        className="px-3 py-1.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-900/40 font-bold text-[11px] uppercase tracking-wider inline-flex items-center gap-1"
                      >
                        Voir
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: MODULES SYNOPTIC OVERVIEW */}
      {activeTab === 'modules' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-md space-y-4">
          <h2 className="text-lg font-bold text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-slate-900" />
            Vue Synoptique par Module
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analytics.moduleStats.map(modStat => (
              <div key={modStat.moduleId} className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3 border-l-4 border-l-slate-900">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-xl bg-slate-100 text-slate-900 font-mono text-xs font-bold border border-slate-900/30">
                    {modStat.code}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    {modStat.totalSessions} session(s)
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 text-sm leading-snug uppercase tracking-tight">
                  {modStat.title}
                </h3>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-xs">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Moyenne Finale</div>
                    <div className="text-lg font-extrabold text-slate-900">
                      {modStat.averageScore} / 10
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Validation</div>
                    <div className="text-lg font-extrabold text-emerald-400">
                      {modStat.passRate}%
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: PUNCTUALITY & ALERTS */}
      {activeTab === 'punctuality' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-md space-y-4">
            <h2 className="text-lg font-bold text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-900" />
              Répartition Soumissions À Temps vs En Retard
            </h2>

            <div className="h-64 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.25rem', color: '#fff', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="flex justify-center gap-6 text-xs pt-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold uppercase tracking-wider">
                <div className="w-3 h-3 rounded-xl bg-emerald-500" />
                À Temps (+2 Bonus) : {analytics.onTimePercentage}%
              </div>
              <div className="flex items-center gap-2 text-rose-400 font-bold uppercase tracking-wider">
                <div className="w-3 h-3 rounded-xl bg-rose-500" />
                En Retard (Malus) : {100 - analytics.onTimePercentage}%
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-md space-y-4">
            <h2 className="text-lg font-bold text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              Liste des Retardataires Fréquents
            </h2>

            {analytics.frequentLateSubmitters.length > 0 ? (
              <div className="space-y-3">
                {analytics.frequentLateSubmitters.map(late => (
                  <div key={late.studentId} className="bg-white p-4 rounded-2xl border border-rose-500/40 border-l-4 border-l-rose-500 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{late.studentName}</div>
                      <div className="text-xs text-rose-400 font-semibold">
                        {late.lateCount} soumission(s) après 16h00
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-400">Impact moyen malus</div>
                      <div className="text-sm font-bold text-rose-400">{late.avgAdjustment} pts</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-slate-400 py-12 text-xs uppercase tracking-wider">
                Aucun retardataire fréquent détecté ! Toute la promotion est ponctuelle.
              </div>
            )}
          </div>

        </div>
      )}

      {/* INDIVIDUAL STUDENT PROGRESSION MODAL */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-slate-50/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border-2 border-slate-300 border-l-8 border-l-slate-900 rounded-2xl max-w-4xl w-full p-6 sm:p-8 space-y-6 shadow-md relative my-8">
            
            <button
              onClick={() => setSelectedStudent(null)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 text-xl font-bold p-2"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Student Modal Header */}
            <div className="flex items-center gap-4">
              <img
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(selectedStudent.name)}`}
                alt={selectedStudent.name}
                className="w-16 h-16 rounded-2xl border-2 border-slate-900 bg-slate-100"
              />
              <div>
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{selectedStudent.name}</h2>
                <p className="text-xs text-slate-400 font-mono">{selectedStudent.email}</p>
                <div className="flex items-center gap-3 mt-2 text-xs">
                  <span className="text-emerald-400 font-bold uppercase tracking-wider">
                    Moyenne : {selectedStudent.averageScore} / 10
                  </span>
                  <span>•</span>
                  <span className="text-slate-900 font-bold uppercase tracking-wider">
                    {selectedStudent.validatedModulesCount} / {selectedStudent.totalQuizzes} Validés
                  </span>
                </div>
              </div>
            </div>

            {/* Individual Curve Chart */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-900 uppercase tracking-wider">
                <span>Courbe Chronologique : {selectedStudent.name}</span>
                <span className="text-slate-900">Progression individuelle</span>
              </div>

              <div className="h-48 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={selectedStudent.history.map(h => ({
                    date: h.sessionDate.split('-').slice(1).join('/'),
                    finalScore: h.finalScore,
                    baseScore: h.baseScore
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                    <YAxis domain={[0, 10]} stroke="#94a3b8" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.25rem', color: '#fff', fontSize: '11px' }} />
                    <Line type="monotone" dataKey="finalScore" name="Note Finale" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Individual Submissions Log */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Détail des {selectedStudent.history.length} soumissions :
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px] bg-white">
                      <th className="py-2.5 px-2">Session</th>
                      <th className="py-2.5 px-2">Date</th>
                      <th className="py-2.5 px-2 text-center">Note Base</th>
                      <th className="py-2.5 px-2 text-center">Bonus/Malus</th>
                      <th className="py-2.5 px-2 text-center">Note Finale</th>
                      <th className="py-2.5 px-2 text-right">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedStudent.history.map(h => (
                      <tr key={h.id}>
                        <td className="py-2.5 px-2 font-bold text-slate-900">{h.sessionTitle}</td>
                        <td className="py-2.5 px-2 font-mono text-slate-700">{h.sessionDate}</td>
                        <td className="py-2.5 px-2 text-center font-bold">{h.baseScore} / 10</td>
                        <td className="py-2.5 px-2 text-center font-bold">
                          <span className={h.adjustment >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                            {h.adjustment >= 0 ? `+${h.adjustment}` : h.adjustment} pts
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-center font-extrabold text-emerald-400">{h.finalScore} / 10</td>
                        <td className="py-2.5 px-2 text-right font-bold uppercase text-[10px]">
                          {h.isValidated ? (
                            <span className="text-emerald-400">✓ Validé</span>
                          ) : (
                            <span className="text-rose-400">✗ Non validé</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedStudent(null)}
                className="px-5 py-2 rounded-2xl bg-slate-100 text-slate-900 font-bold text-xs uppercase tracking-wider hover:bg-slate-700 border border-slate-300"
              >
                Fermer la fiche
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
