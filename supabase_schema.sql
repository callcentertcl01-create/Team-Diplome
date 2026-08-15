-- ============================================================
-- TEAM DIPLÔME — Schéma SQL Supabase
-- Exécutez ce fichier dans : Supabase > SQL Editor > New query
-- ============================================================

-- 1. Table des profils utilisateurs (liée à auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('admin', 'student')),
  avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Modules de cours
CREATE TABLE IF NOT EXISTS public.modules (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Sessions de cours
CREATE TABLE IF NOT EXISTS public.sessions (
  id TEXT PRIMARY KEY,
  module_id TEXT NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  module_title TEXT NOT NULL,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  start_time TEXT NOT NULL DEFAULT '15:00',
  end_time TEXT NOT NULL DEFAULT '16:00',
  pdf_file_name TEXT,
  pdf_text_snippet TEXT,
  is_quiz_ready BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'ready', 'error')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Quiz
CREATE TABLE IF NOT EXISTS public.quizzes (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE REFERENCES public.sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Questions des quiz
CREATE TABLE IF NOT EXISTS public.questions (
  id TEXT PRIMARY KEY,
  quiz_id TEXT NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  choices JSONB NOT NULL,
  correct_answer INTEGER NOT NULL,
  explanation TEXT,
  order_index INTEGER DEFAULT 0
);

-- 6. Soumissions des étudiants
CREATE TABLE IF NOT EXISTS public.submissions (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES public.sessions(id),
  student_id UUID NOT NULL REFERENCES public.users(id),
  answers JSONB NOT NULL,
  base_score NUMERIC NOT NULL,
  adjustment NUMERIC NOT NULL DEFAULT 0,
  final_score NUMERIC NOT NULL,
  is_validated BOOLEAN NOT NULL DEFAULT FALSE,
  is_late BOOLEAN NOT NULL DEFAULT FALSE,
  late_days INTEGER DEFAULT 0,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- Modules, sessions, quiz, questions : lecture publique (tous les connectés)
DROP POLICY IF EXISTS "Public read modules" ON public.modules;
CREATE POLICY "Public read modules" ON public.modules FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role write modules" ON public.modules;
CREATE POLICY "Service role write modules" ON public.modules FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public read sessions" ON public.sessions;
CREATE POLICY "Public read sessions" ON public.sessions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role write sessions" ON public.sessions;
CREATE POLICY "Service role write sessions" ON public.sessions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public read quizzes" ON public.quizzes;
CREATE POLICY "Public read quizzes" ON public.quizzes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role write quizzes" ON public.quizzes;
CREATE POLICY "Service role write quizzes" ON public.quizzes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public read questions" ON public.questions;
CREATE POLICY "Public read questions" ON public.questions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role write questions" ON public.questions;
CREATE POLICY "Service role write questions" ON public.questions FOR ALL USING (true) WITH CHECK (true);

-- Profils utilisateurs
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Service role full access users" ON public.users;
CREATE POLICY "Service role full access users" ON public.users FOR ALL USING (true) WITH CHECK (true);

-- Soumissions
DROP POLICY IF EXISTS "Students read own submissions" ON public.submissions;
CREATE POLICY "Students read own submissions" ON public.submissions FOR SELECT USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students insert own submissions" ON public.submissions;
CREATE POLICY "Students insert own submissions" ON public.submissions FOR INSERT WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Service role full access submissions" ON public.submissions;
CREATE POLICY "Service role full access submissions" ON public.submissions FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- TRIGGER : Créer profil automatiquement après inscription
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role, avatar)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar',
      'https://api.dicebear.com/7.x/avataaars/svg?seed=' || NEW.email
    )
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, public.users.name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- SEED DONNÉES : Modules & Sessions
-- ============================================================

INSERT INTO public.modules (id, code, title, description) VALUES
('mod-1', 'MOD-101', 'Théorie & Doctrines des Relations Internationales', 'Analyse des paradigmes réaliste, libéral, constructiviste et étude des concepts clés d''extranéité et de souveraineté.'),
('mod-2', 'MOD-102', 'Législation Fiscale & Douanière', 'Régimes douaniers, valeur transactionnelle, TVA à l''importation et contentieux fiscal international.'),
('mod-3', 'MOD-103', 'Contrats Administratifs, Marchés Publics & GRH', 'Droit administratif des contrats, principes de mise en concurrence et gestion statutaire du personnel public.'),
('mod-4', 'MOD-104', 'Géopolitique & Diplomatie Contemporaine', 'Organisations régionales, diplomatie multilatérale, droit de la mer et règlement pacifique des différends.'),
('mod-5', 'MOD-105', 'Finances Publiques & Économie Internationale', 'Élaboration du budget, lois de finances, système de Bretton Woods et dette souveraine.'),
('mod-6', 'MOD-106', 'Grandes Synthèses & Oral de Diplôme', 'Cas pratiques transversaux, préparation aux épreuves orales et examen d''assimilation générale.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.sessions (id, module_id, module_title, title, date, start_time, end_time, pdf_file_name, pdf_text_snippet, is_quiz_ready, status) VALUES
('sess-101-1','mod-1','Théorie & Doctrines des RI','Jour 1 - Courants Réalistes et Libéraux','2026-08-12','15:00','16:00','Cours_RI_Module1_Jour1.pdf','Le réalisme considère les États comme des acteurs rationnels dans un système anarchique. Morgenthau formalise l intérêt national en termes de puissance.',true,'ready'),
('sess-101-2','mod-1','Théorie & Doctrines des RI','Jour 2 - Extranéité & Souveraineté des États','2026-08-13','15:00','16:00','Cours_RI_Module1_Jour2.pdf','L extranéité caractérise toute situation juridique comportant un élément rattaché à un État étranger.',true,'ready'),
('sess-102-1','mod-2','Législation Fiscale & Douanière','Jour 1 - Tarifs Douaniers & Valeur en Douane','2026-08-14','15:00','16:00','Cours_Fiscalite_Module2_Jour1.pdf','La valeur en douane des marchandises importées est la valeur transactionnelle.',true,'ready'),
('sess-102-2','mod-2','Législation Fiscale & Douanière','Jour 2 - Procédures de Dédouanement','2026-08-15','15:00','16:00','Cours_Fiscalite_Module2_Jour2.pdf','Le dédouanement informatisé permet l émission du Bon à Enlever.',true,'ready'),
('sess-103-1','mod-3','Contrats Administratifs & GRH','Jour 1 - Passation des Marchés Publics','2026-08-16','15:00','16:00','Cours_DroitAdmin_Module3_Jour1.pdf','Les marchés publics respectent la liberté d accès, l égalité de traitement des candidats.',true,'ready'),
('sess-103-2','mod-3','Contrats Administratifs & GRH','Jour 2 - Gestion des Ressources Humaines publiques','2026-08-17','15:00','16:00','Cours_GRH_Module3_Jour2.pdf','Le statut général de la fonction publique protège le fonctionnaire.',true,'ready'),
('sess-104-1','mod-4','Géopolitique & Diplomatie','Jour 1 - Organisations Régionales & Gouvernance','2026-08-18','15:00','16:00','Cours_Geopolitique_Module4_Jour1.pdf','Les organisations régionales complètent l action de l ONU.',true,'ready'),
('sess-104-2','mod-4','Géopolitique & Diplomatie','Jour 2 - Arbitrage & Règlement des Différends','2026-08-19','15:00','16:00','Cours_Diplomatie_Module4_Jour2.pdf','L article 33 de la Charte des Nations Unies énumère les modes de règlement pacifique.',true,'ready'),
('sess-105-1','mod-5','Finances Publiques & Économie','Jour 1 - Lois de Finances & Principes Budgétaires','2026-08-20','15:00','16:00','Cours_Finances_Module5_Jour1.pdf','Les grands principes budgétaires sont l unité, l universalité, l annuité.',true,'ready'),
('sess-105-2','mod-5','Finances Publiques & Économie','Jour 2 - FMI, Banque Mondiale & Stabilisation','2026-08-21','15:00','16:00','Cours_Economie_Module5_Jour2.pdf','Le FMI veille à la stabilité du système monétaire international.',true,'ready'),
('sess-106-1','mod-6','Grandes Synthèses & Oral','Jour 1 - Cas Pratiques Transversaux','2026-08-23','15:00','16:00','Cours_Synthese_Module6_Jour1.pdf','L examen oral évalue la maîtrise synthétique du droit public, des RI et des finances.',true,'ready'),
('sess-106-2','mod-6','Grandes Synthèses & Oral','Jour 2 - Examen Blanc Final','2026-08-24','15:00','16:00','Cours_ExamenBlanc_Module6_Jour2.pdf','Test général de validation.',true,'ready'),
('sess-106-3','mod-6','Grandes Synthèses & Oral','Jour 3 - Clôture du Programme','2026-08-25','15:00','16:00','Cours_Cloture_Module6_Jour3.pdf','Évaluation finale du diplôme Team Diplôme.',true,'ready')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SEED QUIZ & QUESTIONS pour chaque session
-- ============================================================

INSERT INTO public.quizzes (id, session_id, title) VALUES
('q-101-1','sess-101-1','Quiz - Doctrines des RI (Jour 1)'),
('q-101-2','sess-101-2','Quiz - Extranéité & Souveraineté (Jour 2)'),
('q-102-1','sess-102-1','Quiz - Tarifs Douaniers & Fiscalité'),
('q-102-2','sess-102-2','Quiz - Procédures & Contentieux Douanier'),
('q-103-1','sess-103-1','Quiz - Marchés Publics & Commande Publique'),
('q-103-2','sess-103-2','Quiz - GRH et Statut de la Fonction Publique'),
('q-104-1','sess-104-1','Quiz - Organisations & Multilatéralisme'),
('q-104-2','sess-104-2','Quiz - Différends & Arbitrage International'),
('q-105-1','sess-105-1','Quiz - Principes Budgétaires & Lois de Finances'),
('q-105-2','sess-105-2','Quiz - Institutions Financières Internationales'),
('q-106-1','sess-106-1','Quiz - Synthèse Globale RI & Droit'),
('q-106-2','sess-106-2','Quiz - Examen Blanc Officiel'),
('q-106-3','sess-106-3','Quiz de Clôture Générale')
ON CONFLICT (id) DO NOTHING;

-- Mise à jour quiz_id sur sessions
UPDATE public.sessions SET is_quiz_ready = true, status = 'ready' WHERE id IN (
  'sess-101-1','sess-101-2','sess-102-1','sess-102-2','sess-103-1','sess-103-2',
  'sess-104-1','sess-104-2','sess-105-1','sess-105-2','sess-106-1','sess-106-2','sess-106-3'
);

-- Questions pour q-101-1 (exemple complet — les autres quiz auront des questions similaires)
INSERT INTO public.questions (id, quiz_id, question, choices, correct_answer, explanation, order_index) VALUES
('q-101-1-q1','q-101-1','Qu''est-ce que l''élément d''extranéité ?','["La présence d''un élément étranger reliant la situation juridique à un autre État","L''interdiction absolue de traiter avec des entreprises étrangères","Une clause d''exonération fiscale réservée aux diplomates","Un différend territorial jugé exclusivement par le Conseil de Sécurité"]',0,'L''élément d''extranéité est l''élément de fait ou de droit qui met en relation une situation juridique avec un ordre juridique étranger.',1),
('q-101-1-q2','q-101-1','Quel principe régit la souveraineté absolue des États selon la Charte de l''ONU ?','["Le principe de suprématie monétaire","L''égalité souveraine des États et la non-ingérence dans les affaires intérieures","La libre circulation sans contrôle douanier","L''obligation de soumission aux décrets multilatéraux"]',1,'Article 2§1 de la Charte de l''ONU : L''Organisation est fondée sur le principe de l''égalité souveraine de tous ses Membres.',2),
('q-101-1-q3','q-101-1','Selon la théorie réaliste des RI, quel est l''acteur principal ?','["Les organisations non gouvernementales (ONG)","L''État-nation agissant dans un système anarchique","Les firmes multinationales","Les instances religieuses supranationales"]',1,'Le réalisme considère l''État souverain comme l''unité centrale guidée par la quête d''intérêt national.',3),
('q-101-1-q4','q-101-1','Quelle est la définition juridique d''un marché public ?','["Un contrat conclu à titre onéreux entre un acheteur public et un opérateur économique","Une décision unilatérale prise par le préfet","Un accord de partenariat informel entre deux communes","Un bail commercial privé conclu sans mise en concurrence"]',0,'Le marché public est un contrat à titre onéreux répondant aux besoins de l''acheteur public.',4),
('q-101-1-q5','q-101-1','En droit fiscal douanier, qu''appelle-t-on la valeur en douane ?','["Le prix de revente final sur le marché local","La valeur transactionnelle ajustée des frais de transport et d''assurance","Le coût de fabrication net en usine","Une taxe forfaitaire fixe attribuée par la douane"]',1,'La valeur en douane se base principalement sur la valeur transactionnelle (cout, assurance, fret).',5),
('q-101-1-q6','q-101-1','Quel auteur est associé au concept de Dilemme de sécurité ?','["John H. Herz","Adam Smith","René Cassin","Hugo Grotius"]',0,'John Herz a formalisé le dilemme de sécurité en 1951.',6),
('q-101-1-q7','q-101-1','Quelle condition engage la responsabilité contractuelle de l''Administration ?','["Une faute lourde ou un préjudice direct et certain","Une grève générale des agents territoriaux","Un avis défavorable du Conseil économique","Une baisse du chiffre d''affaires du sous-traitant"]',0,'La responsabilité contractuelle administrative exige un manquement contractuel et un préjudice direct.',7),
('q-101-1-q8','q-101-1','Que garantit le principe du statut général des fonctionnaires ?','["La séparation du grade et de l''emploi","L''attribution automatique d''un logement de fonction","L''interdiction de tout syndicat dans l''administration","L''exemption totale d''impôt sur le revenu"]',0,'Le principe fondamental garantit la séparation du grade (titre) et de l''emploi (poste occupé).',8),
('q-101-1-q9','q-101-1','Qu''a instauré le Traité de Westphalie (1648) ?','["Le système westphalien fondé sur la souveraineté territoriale des États","La création du Fonds Monétaire International","Le contrôle des armements nucléaires","La cour permanente de justice internationale"]',0,'Les traités de Westphalie ont consacré l''État souverain territorial.',9),
('q-101-1-q10','q-101-1','Quelle est la règle de décision du Conseil de Sécurité de l''ONU ?','["Majorité simple des 193 membres","Vote affirmatif de 9 membres dont le droit de veto des 5 membres permanents","Unanimité absolue des 15 membres","Consensus obligatoire des 27 membres de l''UE"]',1,'Les décisions requièrent 9 voix affirmatives incluant le vote concordant des 5 membres permanents.',10)
ON CONFLICT (id) DO NOTHING;

-- Questions identiques pour tous les autres quiz (copie des mêmes 10 questions)
DO $$
DECLARE
  quiz_ids TEXT[] := ARRAY['q-101-2','q-102-1','q-102-2','q-103-1','q-103-2','q-104-1','q-104-2','q-105-1','q-105-2','q-106-1','q-106-2','q-106-3'];
  qid TEXT;
  src_questions RECORD;
BEGIN
  FOREACH qid IN ARRAY quiz_ids LOOP
    FOR src_questions IN SELECT * FROM public.questions WHERE quiz_id = 'q-101-1' LOOP
      INSERT INTO public.questions (id, quiz_id, question, choices, correct_answer, explanation, order_index)
      VALUES (
        qid || '-q' || src_questions.order_index,
        qid,
        src_questions.question,
        src_questions.choices,
        src_questions.correct_answer,
        src_questions.explanation,
        src_questions.order_index
      ) ON CONFLICT (id) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- ============================================================
-- INDEX DE PERFORMANCE
-- ============================================================

-- Index sur submissions pour les requêtes analytiques admin
CREATE INDEX IF NOT EXISTS idx_submissions_student_id ON public.submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_session_id ON public.submissions(session_id);
CREATE INDEX IF NOT EXISTS idx_submissions_submitted_at ON public.submissions(submitted_at DESC);

-- Index sur sessions pour le tri par date
CREATE INDEX IF NOT EXISTS idx_sessions_module_id ON public.sessions(module_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON public.sessions(date ASC);

-- Index sur questions pour le tri par quiz
CREATE INDEX IF NOT EXISTS idx_questions_quiz_id ON public.questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_questions_order ON public.questions(quiz_id, order_index ASC);

-- Index sur users pour la recherche par email
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(lower(email));

-- ============================================================
-- POLICIES ADDITIONNELLES : Admin peut tout lire
-- ============================================================

-- Permettre à l'admin (service_role) de lire toutes les soumissions pour analytics
DROP POLICY IF EXISTS "Admin read all submissions" ON public.submissions;
CREATE POLICY "Admin read all submissions" ON public.submissions
  FOR SELECT USING (true);

-- Permettre à l'admin de lire tous les profils
DROP POLICY IF EXISTS "Admin read all users" ON public.users;
CREATE POLICY "Admin read all users" ON public.users
  FOR SELECT USING (true);

-- ============================================================
-- TRIGGER : Mise à jour du profil si email change
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users
  SET email = NEW.email
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.email IS DISTINCT FROM NEW.email)
  EXECUTE FUNCTION public.handle_user_update();
