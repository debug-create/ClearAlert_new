import { GoogleGenAI, Type } from "@google/genai";

export const SCAM_TYPES = [
  "Digital Arrest Scam",
  "UPI Collect Fraud",
  "KYC Expiry Scam",
  "Fake Bank Alert",
  "FedEx / DHL Parcel Scam",
  "Investment / Stock Market Scam",
  "Sextortion Opener",
  "Fake Loan Offer",
  "Lottery / Prize Scam",
  "OTP / Screen Share Scam",
  "Phishing Link",
  "Job Scam",
  "Safe / Legitimate"
] as const;

export const RISK_LEVELS = ["SAFE", "SUSPICIOUS", "HIGH_RISK", "CRITICAL"] as const;

export type RiskLevel = (typeof RISK_LEVELS)[number];
export type ScamType = (typeof SCAM_TYPES)[number];

export interface AnalysisResult {
  risk_level: RiskLevel;
  scam_type: ScamType;
  confidence: number;
  tactics_used: string[];
  red_flags: string[];
  plain_language_explanation: string;
  action_checklist: string[];
}

const SYSTEM_PROMPT = `You are ClearAlert, an expert scam detection AI trained specifically on Indian cybercrime patterns. 
Your job is to analyze a message, URL, or text excerpt and determine if it is a scam.

VALID SCAM TYPES:
${SCAM_TYPES.map(t => `- "${t}"`).join("\n")}

VALID RISK LEVELS:
${RISK_LEVELS.map(l => `- "${l}"`).join("\n")}

Key rules:
1. NEVER hallucinate scam types not in the valid list above.
2. If content seems safe, return risk_level "SAFE" and scam_type "Safe / Legitimate".
3. Focus on Indian-specific patterns: urgency about Aadhaar/KYC/UPI, impersonation of Indian banks (SBI/HDFC/ICICI), government agencies (CBI/ED/TRAI), courier services (FedEx/India Post).
4. Treat any message creating extreme urgency + requesting financial action as HIGH_RISK minimum.
5. Provide a plain English explanation suitable for a 60-year-old non-technical person.`;

export async function analyzeContent(text: string, imageBase64?: string): Promise<AnalysisResult> {
  const apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY || (process.env as any).GEMINI_API_KEY;
  
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not configured. Falling back to pattern matching.");
    throw new Error("OFFLINE_FALLBACK");
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const model = "gemini-3.1-flash-preview";
    
    const contents: any[] = [];
    if (imageBase64) {
      contents.push({
        inlineData: {
          data: imageBase64.split(",")[1],
          mimeType: "image/png"
        }
      });
    }
    contents.push({ text: `Analyze this content for scam indicators:\n\n${text}` });

    const response = await ai.models.generateContent({
      model,
      contents: { parts: contents },
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            risk_level: { type: Type.STRING, enum: [...RISK_LEVELS] },
            scam_type: { type: Type.STRING, enum: [...SCAM_TYPES] },
            confidence: { type: Type.INTEGER },
            tactics_used: { type: Type.ARRAY, items: { type: Type.STRING } },
            red_flags: { type: Type.ARRAY, items: { type: Type.STRING } },
            plain_language_explanation: { type: Type.STRING },
            action_checklist: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["risk_level", "scam_type", "confidence", "tactics_used", "red_flags", "plain_language_explanation", "action_checklist"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    return result as AnalysisResult;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("OFFLINE_FALLBACK");
  }
}
