
import { GoogleGenAI, Type } from "@google/genai";
import { Patient, AnalysisResult } from "../types";

// Analyze patient history using Gemini API
export const analyzePatientHistory = async (patient: Patient): Promise<AnalysisResult> => {
  // Always use process.env.API_KEY directly as a named parameter.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
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
    // Using gemini-3-pro-preview for complex reasoning task (medical analysis)
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

    // response.text is a property, not a method.
    const text = response.text;
    if (!text) {
      throw new Error("No text content returned from the model.");
    }

    return JSON.parse(text);
  } catch (error) {
    console.error("Analysis Error:", error);
    return {
      summary: "Error analyzing case. Please review clinical notes manually.",
      redFlags: ["System unavailable or API limit reached"],
      recommendations: ["Ensure manual pre-op checklist is completed", "Verify patient records manually"]
    };
  }
};
