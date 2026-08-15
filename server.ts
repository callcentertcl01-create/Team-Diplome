import express from "express";
import path from "path";
// ⚠️  NE PAS importer vite statiquement ici — crash Vercel serverless
// L'import se fait dynamiquement plus bas, uniquement en dev local
import { db } from "./server/db";
import { generateQuizFromText } from "./server/gemini";
import { getSupabaseServer } from "./server/supabaseServer";

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8080;

async function startServer() {

  app.use(express.json({ limit: "25mb" }));

  // --- API ENDPOINTS ---

  // 1. Auth & Users (Server-side handled to protect API keys)
  app.get("/api/users", async (req, res) => {
    await db.syncFromSupabase();
    res.json(db.getUsers());
  });

  app.post("/api/auth/supabase-signup", async (req, res) => {
    const { firstName, lastName, email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "L'adresse e-mail et le mot de passe sont requis." });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Le mot de passe doit contenir au moins 6 caractères." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const fullName = `${firstName || ''} ${lastName || ''}`.trim() || cleanEmail;
    let supabaseUserId: string | undefined;
    let supabaseSession: any = null;

    const supabase = getSupabaseServer();
    if (supabase) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
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
          if (error.message.includes("already registered") || error.message.includes("User already registered")) {
            return res.status(400).json({ error: "Un compte existe déjà avec cet e-mail. Veuillez vous connecter." });
          }
          return res.status(400).json({ error: error.message || "Erreur lors de l'inscription." });
        }

        if (data?.user) {
          supabaseUserId = data.user.id;
          supabaseSession = data.session;

          // Try auto-confirming email if admin API is available
          try {
            await supabase.auth.admin.updateUserById(data.user.id, { email_confirm: true });
          } catch (autoConfirmErr) {
            console.warn("SignUp auto-confirm note:", autoConfirmErr);
          }
        }
      } catch (err: any) {
        console.error("Erreur backend Supabase Auth SignUp :", err);
        return res.status(500).json({ error: "Erreur serveur lors de l'inscription." });
      }
    }

    const localUser = db.registerStudent(fullName, cleanEmail, supabaseUserId);

    const fullUserObj = {
      id: localUser.id,
      email: localUser.email,
      name: localUser.name,
      role: localUser.role,
      avatar: localUser.avatar
    };

    const fullSessionObj = supabaseSession ? { ...supabaseSession, user: fullUserObj } : {
      user: fullUserObj,
      access_token: 'local-token-' + Date.now()
    };

    return res.json({
      user: fullUserObj,
      session: fullSessionObj
    });
  });

  app.post("/api/auth/supabase-signin", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "L'adresse e-mail et le mot de passe sont requis." });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Check admin credentials
    if (cleanEmail === 'admin@teamdiplome.com' || cleanEmail === 'admin@formation.fr') {
      if (password === 'admin123') {
        let adminUser = db.getUserByEmail(cleanEmail);
        if (!adminUser) {
          adminUser = {
            id: 'admin-1',
            email: cleanEmail,
            name: 'Prof. Alexandre Vance (Admin)',
            role: 'admin',
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'
          };
        }
        return res.json({
          user: adminUser,
          session: { user: adminUser, access_token: 'admin-token' }
        });
      } else {
        return res.status(401).json({ error: "Mot de passe administrateur incorrect." });
      }
    }

    // 2. Validate with Supabase Auth
    const supabase = getSupabaseServer();
    if (supabase) {
      try {
        let { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password
        });

        // If email not confirmed in Supabase, auto-confirm via admin API if available, then retry
        if (error && error.message.includes('Email not confirmed')) {
          try {
            const { data: userData } = await supabase.auth.admin.listUsers();
            const targetUser = userData?.users?.find((u: any) => u.email?.toLowerCase() === cleanEmail);
            if (targetUser) {
              await supabase.auth.admin.updateUserById(targetUser.id, { email_confirm: true });
              const retry = await supabase.auth.signInWithPassword({
                email: cleanEmail,
                password
              });
              data = retry.data;
              error = retry.error;
            }
          } catch (autoConfirmErr) {
            console.warn("Auto-confirm attempt note:", autoConfirmErr);
          }
        }

        if (error) {
          console.warn("Supabase Auth SignIn Refused:", error.message);
          let userMessage = "Adresse e-mail ou mot de passe incorrect.";
          if (error.message.includes("Email not confirmed")) {
            userMessage = "E-mail non confirmé. Veuillez vérifier votre boîte de réception.";
          }
          return res.status(401).json({ error: userMessage });
        }

        if (data?.user) {
          let localUser = db.getUserByEmail(cleanEmail);
          if (!localUser) {
            const nameFromEmail = cleanEmail.split('@')[0];
            const formattedName = nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1);
            localUser = db.registerStudent(formattedName, cleanEmail, data.user.id);
          } else if (localUser.id !== data.user.id) {
            localUser.id = data.user.id;
          }

          const fullUserObj = {
            id: localUser.id,
            email: localUser.email,
            name: localUser.name,
            role: localUser.role,
            avatar: localUser.avatar
          };

          return res.json({
            user: fullUserObj,
            session: data.session ? { ...data.session, user: fullUserObj } : {
              user: fullUserObj,
              access_token: 'local-token-' + Date.now()
            }
          });
        }
      } catch (err: any) {
        console.error("Erreur backend Supabase Auth SignIn :", err);
        return res.status(500).json({ error: "Erreur lors de la connexion." });
      }
    } else {
      // Local fallback mode when Supabase backend is not configured
      let localUser = db.getUserByEmail(cleanEmail);
      if (!localUser) {
        return res.status(401).json({ error: "Aucun compte trouvé avec cet e-mail. Veuillez d'abord vous inscrire." });
      }

      const fullUserObj = {
        id: localUser.id,
        email: localUser.email,
        name: localUser.name,
        role: localUser.role,
        avatar: localUser.avatar
      };

      return res.json({
        user: fullUserObj,
        session: { user: fullUserObj, access_token: 'local-token-' + Date.now() }
      });
    }
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
  app.get("/api/modules", async (req, res) => {
    await db.syncFromSupabase();
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
  app.get("/api/sessions/:id", async (req, res) => {
    await db.syncFromSupabase();
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
  app.get("/api/student/:id/history", async (req, res) => {
    await db.syncFromSupabase();
    const studentId = req.params.id;
    const history = db.getSubmissionsForStudent(studentId);
    return res.json(history);
  });

  // 7. Admin Analytics Dashboard Data
  app.get("/api/admin/analytics", async (req, res) => {
    await db.syncFromSupabase();
    const analytics = db.getAdminAnalytics();
    return res.json(analytics);
  });

  // 8. CSV Export endpoint
  app.get("/api/admin/export-csv", async (req, res) => {
    await db.syncFromSupabase();
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
}

// --- VITE / STATIC SERVING (dev local uniquement) ---
// Sur Vercel, le frontend est servi depuis dist/ (static build).
// En local, on démarre Vite en middleware mode avec import dynamique.
if (process.env.VERCEL !== "1") {
  (async () => {
    // Enregistrer toutes les routes API d'abord
    await startServer();

    if (process.env.NODE_ENV !== "production") {
      // Import dynamique — Vite ne doit JAMAIS être importé statiquement (crash serverless)
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (_req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`✅ Server Team Diplôme running on http://0.0.0.0:${PORT}`);
      console.log(`📊 Supabase URL: ${process.env.VITE_SUPABASE_URL || '⚠️  non configuré'}`);
      console.log(`🔑 Service Role Key: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ configurée' : '⚠️  non configurée'}`);
    });
  })();
} else {
  // Sur Vercel : enregistrer les routes sans démarrer le serveur
  startServer();
}

// ✅ Export de l'app Express pour Vercel (Serverless Function)
export default app;


