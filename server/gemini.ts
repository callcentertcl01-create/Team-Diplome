import { GoogleGenAI, Type } from "@google/genai";

export async function generateQuizFromText(pdfOrCourseText: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY non configurée dans les variables d'environnement.");
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });

  const systemInstruction = `Tu es un professeur de relations internationales, de droit et de fiscalité. À partir du texte de cours suivant, génère un questionnaire à choix multiples (QCM) de 10 questions. Chaque question doit avoir 4 propositions de réponse, dont une seule est correcte. Les questions doivent tester la compréhension des concepts clés, des définitions, des auteurs et des mécanismes expliqués dans le texte. Fournis le résultat au format JSON avec la structure : { "questions": [ { "question": "...", "choices": ["...", "...", "...", "..."], "correctAnswer": 0, "explanation": "Explication brève..." } ] }.`;

  const prompt = `Texte du cours à analyser pour générer le quiz :\n\n${pdfOrCourseText.substring(0, 15000)}`;

  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: prompt,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          questions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                choices: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                correctAnswer: { type: Type.INTEGER, description: "Index de 0 à 3" },
                explanation: { type: Type.STRING },
              },
              required: ["question", "choices", "correctAnswer"],
            },
          },
        },
        required: ["questions"],
      },
    },
  });

  const responseText = response.text;
  if (!responseText) {
    throw new Error("Aucune réponse reçue du modèle AI.");
  }

  try {
    const parsed = JSON.parse(responseText.trim());
    if (Array.isArray(parsed.questions)) {
      return parsed.questions.map((q: any, idx: number) => ({
        id: `q-${idx + 1}`,
        question: q.question,
        choices: q.choices,
        correctAnswer: typeof q.correctAnswer === "number" ? q.correctAnswer : 0,
        explanation: q.explanation || "Explication basée sur le cours fourni.",
      }));
    }
  } catch (err) {
    console.error("Erreur lors de l'analyse du JSON du quiz généré :", err);
  }

  throw new Error("Impossible de générer des questions valides à partir du texte fourni.");
}
