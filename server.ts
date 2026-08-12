import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { db } from "./server/db";
import { generateQuizFromText } from "./server/gemini";
import { getSupabaseServer } from "./server/supabaseServer";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "25mb" }));

  // --- API ENDPOINTS ---

  // 1. Auth & Users (Server-side handled to protect API keys)
  app.get("/api/users", (req, res) => {
    res.json(db.getUsers());
  });

  app.post("/api/auth/supabase-signup", async (req, res) => {
    const { firstName, lastName, email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "L'adresse e-mail et le mot de passe sont requis." });
    }

    const fullName = `${firstName || ''} ${lastName || ''}`.trim() || email;
    const localUser = db.registerStudent(fullName, email);

    const supabase = getSupabaseServer();
    if (supabase) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName,
              full_name: fullName
            }
          }
        });

        if (error) {
          console.warn("Avertissement Supabase Auth SignUp :", error.message);
          // If error is about email taken, return it
          if (error.message.includes("already registered")) {
            return res.status(400).json({ error: "Un compte existe déjà avec cet e-mail. Veuillez vous connecter." });
          }
        }

        return res.json({
          user: {
            id: data?.user?.id || localUser.id,
            email: localUser.email,
            name: localUser.name,
            role: localUser.role,
            avatar: localUser.avatar
          },
          session: data?.session || { user: { id: localUser.id, email: localUser.email } }
        });
      } catch (err: any) {
        console.error("Erreur backend Supabase Auth SignUp :", err);
      }
    }

    return res.json({
      user: localUser,
      session: { user: { id: localUser.id, email: localUser.email } }
    });
  });

  app.post("/api/auth/supabase-signin", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "L'adresse e-mail et le mot de passe sont requis." });
    }

    // Check admin credentials
    if (email.toLowerCase() === 'admin@teamdiplome.com' && password === 'admin123') {
      let adminUser = db.getUserByEmail(email);
      if (!adminUser) {
        adminUser = {
          id: 'admin-1',
          email,
          name: 'Prof. Alexandre Vance (Admin)',
          role: 'admin',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'
        };
      }
      return res.json({
        user: adminUser,
        session: { user: { id: adminUser.id, email: adminUser.email, role: 'admin' } }
      });
    }

    const supabase = getSupabaseServer();
    if (supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (!error && data?.user) {
          let localUser = db.getUserByEmail(email);
          if (!localUser) {
            localUser = db.registerStudent(data.user.user_metadata?.full_name || email, email);
          }
          return res.json({
            user: localUser,
            session: data.session
          });
        } else if (error) {
          console.warn("Auth signin attempt failed via Supabase :", error.message);
        }
      } catch (err: any) {
        console.error("Erreur backend Supabase Auth SignIn :", err);
      }
    }

    // Fallback to local DB lookup
    const localUser = db.getUserByEmail(email);
    if (localUser) {
      return res.json({
        user: localUser,
        session: { user: { id: localUser.id, email: localUser.email } }
      });
    }

    return res.status(401).json({ error: "Identifiants invalides. Vérifiez votre adresse e-mail et votre mot de passe." });
  });

  app.post("/api/auth/login", (req, res) => {
    const { email, role } = req.body;
    if (!email) {
      return res.status(400).json({ error: "L'adresse e-mail est requise." });
    }

    const user = db.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: "Utilisateur non trouvé. Vérifiez votre adresse e-mail." });
    }

    if (role && user.role !== role) {
      return res.status(403).json({ error: `Accès refusé. Ce compte n'a pas le rôle ${role}.` });
    }

    return res.json({ user });
  });

  app.post("/api/auth/register-student", (req, res) => {
    const { name, email } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: "Le nom et l'e-mail sont obligatoires." });
    }
    const student = db.registerStudent(name, email);
    return res.json({ student });
  });

  // 2. Modules & Sessions
  app.get("/api/modules", (req, res) => {
    res.json(db.getModules());
  });

  app.post("/api/modules", (req, res) => {
    const { code, title, description } = req.body;
    if (!title) {
      return res.status(400).json({ error: "Le titre du module est requis." });
    }
    const moduleObj = db.createModule(code, title, description || "");
    return res.json(moduleObj);
  });

  app.delete("/api/modules/:id", (req, res) => {
    try {
      db.deleteModule(req.params.id);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  app.delete("/api/sessions/:id", (req, res) => {
    try {
      db.deleteSession(req.params.id);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  app.post("/api/modules/:id/sessions", (req, res) => {
    const moduleId = req.params.id;
    const { title, date, startTime, endTime, pdfFileName, pdfTextSnippet } = req.body;
    if (!title || !date) {
      return res.status(400).json({ error: "Le titre et la date sont requis." });
    }

    try {
      const session = db.createSession(
        moduleId,
        title,
        date,
        startTime || "15:00",
        endTime || "16:00",
        pdfFileName,
        pdfTextSnippet
      );
      return res.json(session);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  // 3. AI Quiz Generation from Text / PDF
  app.post("/api/sessions/:id/generate-quiz", async (req, res) => {
    const sessionId = req.params.id;
    const { courseText } = req.body;

    if (!courseText || courseText.trim().length < 20) {
      return res.status(400).json({ error: "Veuillez fournir un texte de cours d'au moins 20 caractères." });
    }

    db.updateSessionStatus(sessionId, 'generating');

    try {
      const questions = await generateQuizFromText(courseText);
      const sessObj = db.getSessionById(sessionId);
      if (!sessObj) {
        return res.status(404).json({ error: "Session introuvable." });
      }

      const quizTitle = `Quiz AI - ${sessObj.session.title}`;
      const quiz = {
        id: `quiz-${Date.now()}`,
        title: quizTitle,
        questions
      };

      db.setSessionQuiz(sessionId, quiz);

      return res.json({
        success: true,
        session: db.getSessionById(sessionId)?.session,
        quiz
      });
    } catch (err: any) {
      console.error("Erreur génération quiz Gemini :", err);
      db.updateSessionStatus(sessionId, 'error');
      return res.status(500).json({
        error: `Échec de la génération du quiz par IA : ${err.message || 'Erreur inconnue'}`
      });
    }
  });

  // 4. Session & Quiz details
  app.get("/api/sessions/:id", (req, res) => {
    const found = db.getSessionById(req.params.id);
    if (!found) {
      return res.status(404).json({ error: "Session non trouvée." });
    }
    return res.json(found.session);
  });

  // 5. Submit Quiz Answers (Student)
  app.post("/api/sessions/:id/submit", (req, res) => {
    const sessionId = req.params.id;
    const { studentId, answers } = req.body;

    if (!studentId || !Array.isArray(answers)) {
      return res.status(400).json({ error: "Données de soumission incomplètes." });
    }

    try {
      const submission = db.submitQuiz(sessionId, studentId, answers);
      return res.json({ success: true, submission });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  // 6. Student History
  app.get("/api/student/:id/history", (req, res) => {
    const studentId = req.params.id;
    const history = db.getSubmissionsForStudent(studentId);
    return res.json(history);
  });

  // 7. Admin Analytics Dashboard Data
  app.get("/api/admin/analytics", (req, res) => {
    const analytics = db.getAdminAnalytics();
    return res.json(analytics);
  });

  // 8. CSV Export endpoint
  app.get("/api/admin/export-csv", (req, res) => {
    const analytics = db.getAdminAnalytics();
    
    // Build CSV content
    let csv = "ID Etudiant;Nom;Email;Quiz Passes;Modules Valides;Moyenne Finale;Moyenne Base;Soumissions a temps;Soumissions en retard;Statut\n";
    
    analytics.studentProgressList.forEach(s => {
      csv += `"${s.studentId}";"${s.name}";"${s.email}";${s.totalQuizzes};${s.validatedModulesCount};${s.averageScore.toString().replace('.', ',')};${s.baseAverageScore.toString().replace('.', ',')};${s.onTimeCount};${s.lateCount};"${s.averageScore >= 6 ? 'VALIDE' : 'NON VALIDE'}"\n`;
    });

    csv += "\n\nDETAILED SUBMISSIONS HISTORY\n";
    csv += "ID Soumission;Nom Etudiant;Session;Module;Date Session;Date Soumission;Note Base (/10);Ajustement Bonus/Malus;Note Finale (/10);Retard;Valide\n";

    analytics.studentProgressList.forEach(s => {
      s.history.forEach(sub => {
        csv += `"${sub.id}";"${sub.studentName}";"${sub.sessionTitle}";"${sub.moduleTitle}";"${sub.sessionDate}";"${sub.submittedAt}";${sub.baseScore};${sub.adjustment};${sub.finalScore};"${sub.isLate ? 'Oui (' + sub.lateDays + 'j)' : 'Non (A temps +2)'}";"${sub.isValidated ? 'Oui' : 'Non'}"\n`;
      });
    });

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=team_diplome_resultats.csv");
    return res.send(csv);
  });

  // 9. Reset database to zero
  app.post("/api/admin/reset-database", async (req, res) => {
    try {
      await db.resetAllData();
      return res.json({ success: true, message: "Base de données réinitialisée à zéro." });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Erreur lors de la réinitialisation" });
    }
  });

  // --- VITE / STATIC SERVING ---
  if (process.env.NODE_ENV !== "production") {
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
