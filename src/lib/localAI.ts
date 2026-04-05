import { pipeline, env } from "@xenova/transformers";

// Configure transformers.js to use the browser-based WASM runtime
env.allowLocalModels = false;
env.useBrowserCache = true;

// Define the type for the extractor pipeline
type FeatureExtractionPipeline = (text: string, options?: any) => Promise<any>;

let extractor: FeatureExtractionPipeline | null = null;

const SCAM_TEMPLATES = [
  // 1-10: Job & Internship Scams
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

  // 11-20: Digital Arrest & Police Scams
  "You are under Digital Arrest. CBI has found illegal narcotics in your parcel.",
  "Stay on this Skype call. Do not tell anyone or you will be jailed immediately.",
  "Police case registered against your mobile number for illegal activities.",
  "Supreme Court order for your immediate arrest. Pay fine to clear your name.",
  "Narcotics department has seized your package containing drugs and passports.",
  "Mumbai Police: Your Aadhaar is linked to money laundering. Pay to settle.",
  "Customs department: Your parcel contains 5 passports and 200g of MDMA.",
  "Cyber Cell: Your social media is being used for anti-national activities.",
  "Immediate court summons issued. Pay legal fee to avoid jail time.",
  "CBI: We have evidence of your involvement in a major financial fraud.",

  // 21-30: Fake Stock & Trading Tips
  "Join our exclusive WhatsApp group for 100% guaranteed stock market profit.",
  "Invest ₹10,000 and get ₹50,000 returns in just 2 days. SEBI registered.",
  "Double your crypto investment in 24 hours. Verified trading platform.",
  "Insider trading tips from market experts. Join our VIP Telegram channel.",
  "Earn 20% daily profit on your capital with our AI trading bot.",
  "Join our premium stock advisory. 99% accuracy in Nifty options.",
  "Exclusive IPO allotment guaranteed. Pay application fee to our agent.",
  "Learn how to make ₹1 Lakh daily from stock market. Free webinar link.",
  "Invest in our private equity fund for massive returns. Limited slots.",
  "Get 500% return on your investment in 6 months. Guaranteed by experts.",

  // 31-40: KYC & Bank Blocks
  "Your bank account will be blocked in 24 hours. Update KYC now.",
  "SBI Alert: Your YONO account is suspended. Click here to verify.",
  "Unauthorized login attempt on your ICICI net banking. Secure it now.",
  "Your PAN card is deactivated. Update details here to avoid ₹10,000 fine.",
  "HDFC: Your credit card is blocked due to suspicious activity. Verify now.",
  "Axis Bank: Your account is on hold. Update your Aadhaar details immediately.",
  "Your debit card will expire today. Click here to renew and avoid charges.",
  "Bank Alert: Your account is being closed. Transfer funds to secure account.",
  "Update your KYC via this link or your account will be permanently frozen.",
  "Your net banking access is restricted. Click here to restore access.",

  // 41-50: Hinglish Scams
  "Police case darj hua hai aapke naam pe. Arrest se bachne ke liye call karein.",
  "Aadhaar card link nahi hai bank se. Account band hone wala hai.",
  "Aapka account block ho jayega. Turant KYC update karein link pe click karke.",
  "KBC se ₹25 lakh ki lottery lagi hai. Processing fee jama karein.",
  "Bijli bill baki hai, aaj raat connection kat jayega. Is number pe call karein.",
  "Ghar baithe paise kamayein. Sirf video like karke ₹5000 rozana.",
  "Aapka parcel customs ne pakda hai. Drugs mile hain. CBI inquiry hogi.",
  "Stock market tips ke liye hamara WhatsApp group join karein. 100% profit.",
  "Aapka mobile number lucky draw mein select hua hai. Prize claim karein.",
  "Bank se call hai, aapka ATM card block ho gaya hai. PIN batayein."
];

async function getExtractor(): Promise<FeatureExtractionPipeline> {
  if (!extractor) {
    extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2") as FeatureExtractionPipeline;
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

    for (const template of SCAM_TEMPLATES) {
      const templateOutput = await pipe(template, { pooling: "mean", normalize: true });
      const templateEmbedding = Array.from(templateOutput.data) as number[];
      const similarity = cosineSimilarity(inputEmbedding, templateEmbedding);

      if (similarity > maxSimilarity) {
        maxSimilarity = similarity;
        closestMatch = template;
      }
    }

    return {
      matched: maxSimilarity > 0.72,
      similarity: maxSimilarity,
      closestMatch,
      scamType: closestMatch.split(":")[0] || "Unknown Scam"
    };
  } catch (error) {
    console.error("Semantic Analysis Error:", error);
    return { matched: false, similarity: 0, closestMatch: "", scamType: "" };
  }
}
