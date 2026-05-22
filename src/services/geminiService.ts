import { GoogleGenAI, Type } from "@google/genai";
import { Patient, AnalysisResult } from '../types';

export const analyzePatientHistory = async (patient: Patient): Promise<AnalysisResult> => {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  
  if (!apiKey) {
    console.warn("EXPO_PUBLIC_GEMINI_API_KEY not configured. Simulating AI analysis.");
    // Simulate high-quality clinical analysis for demo purposes
    return new Promise((resolve) => {
      setTimeout(() => {
        const isSurgical = patient.category === 'Surgical';
        resolve({
          summary: `Clinical summary for ${patient.name} (${patient.age} y/o) undergoing ${patient.operationName} (${patient.side}). History reveals present condition: "${patient.presentHistory || 'N/A'}" and past: "${patient.pastHistory || 'N/A'}".`,
          redFlags: [
            patient.age > 65 ? "Patient age > 65: Evaluate cardiovascular/pulmonary reserve." : "Age-appropriate risk profile.",
            patient.pastHistory.toLowerCase().includes('diabetes') ? "History of diabetes: monitor perioperative glucose." : "No documented major systemic comorbidities.",
            patient.pastHistory.toLowerCase().includes('hypertension') ? "History of hypertension: check BP stability." : "Normotensive profile."
          ].filter(Boolean),
          recommendations: [
            "Complete standard pre-op checklist.",
            "Verify surgical side: " + patient.side,
            "Confirm lab investigations: " + (patient.labInvestigations || "routine labs pending"),
            isSurgical ? "Ensure cross-matched blood is available if required." : "Ensure patient is well-hydrated post-ESWL."
          ]
        });
      }, 1000);
    });
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    As a clinical medical assistant, analyze this patient's history for a ${patient.category} procedure.
    Patient: ${patient.name}
    Age: ${patient.age}
    Category: ${patient.category}
    Operation Name: ${patient.operationName}
    Present History: ${patient.presentHistory}
    Past History: ${patient.pastHistory}
    Lab Investigations: ${patient.labInvestigations}

    Provide a clinical summary of the case, identify any surgical or procedural red flags (e.g., allergies, comorbidities, abnormal labs), and list pre-operative recommendations.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { 
              type: Type.STRING,
              description: "A concise clinical summary of the patient's condition."
            },
            redFlags: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "List of clinical concerns or risks."
            },
            recommendations: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "List of pre-operative steps to take."
            }
          },
          required: ["summary", "redFlags", "recommendations"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("No text content returned from the model.");
    }

    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini AI Analysis Error:", error);
    return {
      summary: "Error analyzing case with Gemini. Please review clinical notes manually.",
      redFlags: ["System unavailable or API limit reached"],
      recommendations: ["Ensure manual pre-op checklist is completed", "Verify patient records manually"]
    };
  }
};
