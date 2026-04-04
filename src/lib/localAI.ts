import { pipeline, env } from "@xenova/transformers";

// Configure transformers.js to use the browser-based WASM runtime
env.allowLocalModels = false;
env.useBrowserCache = true;

let extractor: any = null;

const SCAM_TEMPLATES = [
  // Job & Internship Scams (CRITICAL)
  "Complete 5 YouTube likes to earn ₹2,000 daily. Just send screenshot.",
  "Your TCS internship is approved, pay ₹1,500 for the laptop security deposit.",
  "Join this Telegram VIP task group for daily payout of ₹5,000.",
  "Amazon part-time job available. Earn ₹500 per task. No experience needed.",
  "Work from home data entry job. Pay registration fee to start working.",
  "Government job offer letter received. Pay document verification charges.",
  "Earn money by rating movies on our platform. Initial deposit required.",
  "High paying job in Canada. Pay visa processing fee to our agent.",
  "Congratulations! You are selected for Wipro. Pay for your ID card generation.",
  "Daily income of ₹3,000 by just liking Instagram posts. Join now.",

  // Digital Arrest Scams
  "You are under Digital Arrest. CBI has found illegal narcotics in your parcel.",
  "Stay on this Skype call. Do not tell anyone or you will be jailed immediately.",
  "Police case registered against your mobile number for illegal activities.",
  "Supreme Court order for your immediate arrest. Pay fine to clear your name.",
  "Narcotics department has seized your package containing drugs and passports.",

  // UPI & Banking Scams
  "Enter your UPI PIN to receive your GPay reward of ₹500.",
  "Approve this collect request to get your electricity bill refund.",
  "Your bank account will be blocked in 24 hours. Update KYC now.",
  "SBI Alert: Your YONO account is suspended. Click here to verify.",
  "Transaction failed. Click this link to get your money back into account.",
  "Unauthorized login attempt on your ICICI net banking. Secure it now.",

  // FedEx / Parcel Scams
  "FedEx: Your parcel is detained by Mumbai Customs due to illegal items.",
  "DHL: Pay customs duty of ₹2,500 to release your international shipment.",
  "Your package contains 5 passports and 200g of MDMA. Contact police now.",

  // Investment / Stock Scams
  "Join our exclusive WhatsApp group for 100% guaranteed stock market profit.",
  "Invest ₹10,000 and get ₹50,000 returns in just 2 days. SEBI registered.",
  "Double your crypto investment in 24 hours. Verified trading platform.",
  "Insider trading tips from market experts. Join our VIP Telegram channel.",

  // Lottery / Prize Scams
  "Congratulations! You won ₹25 Lakhs in KBC Lucky Draw. Pay tax to claim.",
  "You have won a free iPhone 15. Click here to provide your address.",
  "Your mobile number is selected for a cash prize of ₹10,000.",

  // Sextortion / Blackmail
  "We have recorded your nude video call. Pay ₹50,000 or we leak it to family.",
  "Your private photos are with us. Pay via UPI or we post on social media.",

  // Remote Access Scams
  "Install AnyDesk to fix your bank account issue. Share the 9-digit code.",
  "Customer care needs TeamViewer access to resolve your pending refund.",
  "Download RustDesk for technical support regarding your internet connection."
];

async function getExtractor() {
  if (!extractor) {
    extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  }
  return extractor;
}

function cosineSimilarity(v1: number[], v2: number[]): number {
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;
  for (let i = 0; i < v1.length; i++) {
    dotProduct += v1[i] * v2[i];
    norm1 += v1[i] * v1[i];
    norm2 += v2[i] * v2[i];
  }
  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

export async function analyzeSemantic(text: string) {
  try {
    const pipe = await getExtractor();
    const output = await pipe(text, { pooling: "mean", normalize: true });
    const inputEmbedding = Array.from(output.data) as number[];

    let maxSimilarity = 0;
    let closestMatch = "";

    // In a real production app, we would pre-compute these embeddings
    // But for this demo, we'll compute them on the fly or cache them
    for (const template of SCAM_TEMPLATES) {
      const templateOutput = await pipe(template, { pooling: "mean", normalize: true });
      const templateEmbedding = Array.from(templateOutput.data) as number[];
      const similarity = cosineSimilarity(inputEmbedding, templateEmbedding);

      if (similarity > maxSimilarity) {
        maxSimilarity = similarity;
        closestMatch = template;
      }
    }

    if (maxSimilarity > 0.72) {
      return {
        matched: true,
        similarity: maxSimilarity,
        closestMatch
      };
    }

    return { matched: false };
  } catch (error) {
    console.error("Semantic Analysis Error:", error);
    return { matched: false };
  }
}
