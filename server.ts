import express from "express";
import path from "path";
import { db } from "./server/db";
import { generateQuizFromText } from "./server/gemini";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "25mb" }));

// ============================================================
// API ENDPOINTS
// ============================================================

// 1. Auth & Users
app.get("/api/users", async (req, res) => {
  try {
    const users = await db.getUsers();
    res.json(users);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Connexion par email (lookup uniquement — la vraie auth est côté Supabase client)
app.post("/api/auth/login", async (req, res) => {
  const { email, role } = req.body;
  if (!email) return res.status(400).json({ error: "L'adresse e-mail est requise." });

  try {
    const user = await db.getUserByEmail(email);
    if (!user) return res.status(404).json({ error: "Utilisateur non trouvé." });
    if (role && user.role !== role) return res.status(403).json({ error: `Accès refusé. Ce compte n'a pas le rôle ${role}.` });
    return res.json({ user });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// Inscription / synchronisation étudiants
app.post("/api/auth/register-student", async (req, res) => {
  const { name, email, supabaseId } = req.body;
  if (!name || !email) return res.status(400).json({ error: "Le nom et l'e-mail sont obligatoires." });

  try {
    const student = await db.registerStudent(name, email, supabaseId);
    return res.json({ student });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// ============================================================
// 2. Modules & Sessions
// ============================================================
app.get("/api/modules", async (req, res) => {
  try {
    const modules = await db.getModules();
    res.json(modules);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/modules", async (req, res) => {
  const { code, title, description } = req.body;
  if (!title) return res.status(400).json({ error: "Le titre du module est requis." });

  try {
    const moduleObj = await db.createModule(code, title, description || "");
    return res.json(moduleObj);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// DELETE module (admin)
app.delete("/api/modules/:id", async (req, res) => {
  try {
    await db.deleteModule(req.params.id);
    return res.json({ success: true, message: "Module supprimé avec succès." });
  } catch (e: any) {
    return res.status(400).json({ error: e.message });
  }
});

// Créer une session dans un module
app.post("/api/modules/:id/sessions", async (req, res) => {
  const moduleId = req.params.id;
  const { title, date, startTime, endTime, pdfFileName, pdfTextSnippet } = req.body;
  if (!title || !date) return res.status(400).json({ error: "Le titre et la date sont requis." });

  try {
    const session = await db.createSession(moduleId, title, date, startTime || "15:00", endTime || "16:00", pdfFileName, pdfTextSnippet);
    return res.json(session);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ============================================================
// 3. Sessions
// ============================================================
app.get("/api/sessions/:id", async (req, res) => {
  try {
    const found = await db.getSessionById(req.params.id);
    if (!found) return res.status(404).json({ error: "Session non trouvée." });
    return res.json(found.session);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE session (admin)
app.delete("/api/sessions/:id", async (req, res) => {
  try {
    await db.deleteSession(req.params.id);
    return res.json({ success: true, message: "Session supprimée avec succès." });
  } catch (e: any) {
    return res.status(400).json({ error: e.message });
  }
});

// Soumissions d'une session (admin) — voir toutes les copies
app.get("/api/sessions/:id/submissions", async (req, res) => {
  try {
    const submissions = await db.getSubmissionsForSession(req.params.id);
    return res.json(submissions);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// ============================================================
// 4. Génération Quiz IA
// ============================================================
app.post("/api/sessions/:id/generate-quiz", async (req, res) => {
  const sessionId = req.params.id;
  const { courseText } = req.body;

  if (!courseText || courseText.trim().length < 20) {
    return res.status(400).json({ error: "Veuillez fournir un texte d'au moins 20 caractères." });
  }

  await db.updateSessionStatus(sessionId, 'generating');

  try {
    const questions = await generateQuizFromText(courseText);
    const sessObj = await db.getSessionById(sessionId);
    if (!sessObj) return res.status(404).json({ error: "Session introuvable." });

    const quizTitle = `Quiz AI - ${sessObj.session.title}`;
    const quiz = { id: `quiz-${Date.now()}`, title: quizTitle, questions };

    await db.setSessionQuiz(sessionId, quiz);

    return res.json({ success: true, session: (await db.getSessionById(sessionId))?.session, quiz });
  } catch (err: any) {
    console.error("Erreur génération quiz :", err);
    await db.updateSessionStatus(sessionId, 'error');
    return res.status(500).json({ error: err.message });
  }
});

// ============================================================
// 5. Soumissions Quiz
// ============================================================
app.post("/api/sessions/:id/submit", async (req, res) => {
  const sessionId = req.params.id;
  const { studentId, answers } = req.body;

  if (!studentId || !Array.isArray(answers)) {
    return res.status(400).json({ error: "Données de soumission incomplètes." });
  }

  try {
    const submission = await db.submitQuiz(sessionId, studentId, answers);
    return res.json({ success: true, submission });
  } catch (err: any) {
    if (err.message?.includes('déjà soumis')) {
      return res.status(409).json({ error: err.message });
    }
    return res.status(400).json({ error: err.message });
  }
});

// ============================================================
// 6. Historique étudiant
// ============================================================
app.get("/api/student/:id/history", async (req, res) => {
  try {
    const history = await db.getSubmissionsForStudent(req.params.id);
    return res.json(history);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// ============================================================
// 7. Analytics Admin
// ============================================================
app.get("/api/admin/analytics", async (req, res) => {
  try {
    const analytics = await db.getAdminAnalytics();
    return res.json(analytics);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// ============================================================
// 8. Export CSV
// ============================================================
app.get("/api/admin/export-csv", async (req, res) => {
  try {
    const analytics = await db.getAdminAnalytics();

    let csv = "ID Etudiant;Nom;Email;Quiz Passes;Modules Valides;Moyenne Finale;Moyenne Base;Soumissions a temps;Soumissions en retard;Statut\n";
    analytics.studentProgressList.forEach(s => {
      csv += `"${s.studentId}";"${s.name}";"${s.email}";${s.totalQuizzes};${s.validatedModulesCount};${s.averageScore.toString().replace('.', ',')};${s.baseAverageScore.toString().replace('.', ',')};${s.onTimeCount};${s.lateCount};"${s.averageScore >= 6 ? 'VALIDE' : 'NON VALIDE'}"\n`;
    });

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=team_diplome_resultats.csv");
    return res.send(csv);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// ============================================================
// VITE / STATIC SERVING
// ============================================================
async function startViteAndListen() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  if (process.env.VERCEL !== "1") {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`✅ Server Team Diplôme running on http://0.0.0.0:${PORT}`);
      console.log(`📊 Supabase URL: ${process.env.VITE_SUPABASE_URL || '⚠️  non configuré'}`);
      console.log(`🔑 Service Role Key: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ configurée' : '⚠️  non configurée'}`);
    });
  }
}

// Si on n'est pas sur Vercel, on lance l'écoute et le setup Vite
if (process.env.VERCEL !== "1") {
  startViteAndListen();
}

// Export de l'application pour Vercel (Serverless Functions)
export default app;
