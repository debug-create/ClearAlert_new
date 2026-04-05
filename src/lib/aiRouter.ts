import { GoogleGenAI } from "@google/genai";

const apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenAI({ apiKey });

export interface AnalysisResult {
  risk_level: "SAFE" | "SUSPICIOUS" | "HIGH_RISK" | "CRITICAL";
  scam_type: string;
  confidence: number;
  red_flags: string[];
  action_checklist: string[];
  explanation: string;
}

export async function hybridAnalyze(text: string, localSignals: any): Promise<AnalysisResult> {
  try {
    const model = "gemini-2.0-flash";
    const prompt = `
      Analyze this message for potential scams in the Indian context.
      User Message: "${text}"
      
      Local Analysis Signals:
      - Semantic Match: ${localSignals.semantic.matched ? `Yes (${localSignals.semantic.scamType})` : "No"}
      - Intent Score: ${localSignals.intent.combined}/100
      - Urgency: ${localSignals.intent.urgencyScore}/100
      - Financial Pressure: ${localSignals.intent.financialScore}/100
      - Employment Fraud Indicators: ${localSignals.intent.employmentScore}/100
      
      Provide a final verdict in strict JSON format:
      {
        "risk_level": "SAFE" | "SUSPICIOUS" | "HIGH_RISK" | "CRITICAL",
        "scam_type": "string",
        "confidence": number (0-100),
        "red_flags": ["string"],
        "action_checklist": ["string"],
        "explanation": "string (plain English, clear and concise)"
      }
    `;

    const response = await genAI.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const result = JSON.parse(response.text);
    return result as AnalysisResult;

  } catch (error) {
    console.warn("Gemini Analysis Failed, falling back to local signals:", error);
    
    // Fallback logic using local signals
    let risk_level: "SAFE" | "SUSPICIOUS" | "HIGH_RISK" | "CRITICAL" = "SAFE";
    let scam_type = "Unknown";
    let confidence = localSignals.intent.combined;
    const red_flags: string[] = [];
    const action_checklist: string[] = ["Do not share OTP", "Do not click links", "Report to 1930"];

    if (localSignals.semantic.matched) {
      risk_level = "HIGH_RISK";
      scam_type = localSignals.semantic.scamType;
      confidence = Math.max(confidence, Math.round(localSignals.semantic.similarity * 100));
      red_flags.push("Matches known scam patterns");
    }

    if (localSignals.intent.combined > 70) {
      risk_level = risk_level === "HIGH_RISK" ? "CRITICAL" : "HIGH_RISK";
      red_flags.push("High psychological pressure detected");
    } else if (localSignals.intent.combined > 40) {
      risk_level = risk_level === "SAFE" ? "SUSPICIOUS" : risk_level;
      red_flags.push("Suspicious intent detected");
    }

    if (localSignals.intent.urgencyScore > 60) red_flags.push("Artificial urgency detected");
    if (localSignals.intent.financialScore > 60) red_flags.push("Financial pressure detected");

    return {
      risk_level,
      scam_type: localSignals.semantic.matched ? localSignals.semantic.scamType : "Potential Fraud",
      confidence,
      red_flags: red_flags.length > 0 ? red_flags : ["Unusual message structure"],
      action_checklist,
      explanation: "Our local AI has detected patterns commonly associated with scams. Exercise extreme caution."
    };
  }
}
