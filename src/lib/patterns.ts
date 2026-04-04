export interface Pattern {
  name: string;
  severity: "CRITICAL" | "HIGH_RISK" | "SUSPICIOUS";
  triggers: string[];
  explanation: string;
}

export const PATTERNS: Pattern[] = [
  {
    name: "Digital Arrest Scam",
    severity: "CRITICAL",
    triggers: [
      "digital arrest", "CBI officer", "ED officer", "police case against you",
      "arrest warrant", "money laundering", "stay on call", "do not tell anyone",
      "skype call", "video verification", "supreme court order", "narcotics department",
      "illegal parcel", "stay on video call", "skype call", "supreme court order",
      "money laundering case", "arrest warrant"
    ],
    explanation: "Scammers impersonate CBI/ED/Police officers via video call, claiming you're under investigation. They demand silence and money to 'settle' the case."
  },
  {
    name: "UPI Collect Fraud",
    severity: "CRITICAL",
    triggers: [
      "approve to receive money", "click to get refund", "UPI collect request",
      "enter PIN to receive", "approve payment to get cashback", "PIN to credit",
      "request for money", "receive money", "cashback", "enter pin", "scan qr",
      "collect request", "upi pin", "gpay reward", "phonepe reward"
    ],
    explanation: "Scammers send a COLLECT request pretending it's a payment TO you. When you enter your UPI PIN, money is DEBITED, not credited."
  },
  {
    name: "KYC Expiry Scam",
    severity: "HIGH_RISK",
    triggers: [
      "KYC expired", "KYC update", "account will be blocked", "verify your KYC",
      "BLOCKED in 24", "account suspended", "complete KYC immediately", "PAN card update",
      "kyc expired", "bank account blocked", "update kyc", "sbi kyc", "hdfc kyc",
      "pan card update", "yono sbi", "net banking blocked"
    ],
    explanation: "Fake bank/telecom message claiming your KYC has expired. Link leads to a phishing site that steals your banking credentials."
  },
  {
    name: "Fake Bank Alert",
    severity: "HIGH_RISK",
    triggers: [
      "SBI alert", "HDFC alert", "ICICI alert", "your account will be frozen",
      "suspicious transaction", "verify now to avoid suspension", "net banking blocked",
      "transaction failed", "unauthorized access", "secure your account", "bank alert",
      "otp required", "account suspended", "verify login"
    ],
    explanation: "Impersonates your bank to create panic and urgency, leading you to share OTP or visit a phishing link."
  },
  {
    name: "FedEx / DHL Parcel Scam",
    severity: "HIGH_RISK",
    triggers: [
      "parcel detained", "customs fee pending", "FedEx package", "DHL shipment",
      "contraband found", "your package contains", "pay to release", "illegal items",
      "fedex parcel", "dhl parcel", "customs detention", "illegal items", "parcel held",
      "pay customs duty", "mumbai customs"
    ],
    explanation: "Fake delivery notification claiming your package contains illegal items or requires a customs fee. Used as an entry point for Digital Arrest scams."
  },
  {
    name: "Investment / Stock Market Scam",
    severity: "CRITICAL",
    triggers: [
      "guaranteed returns", "100% profit", "stock tips group", "SEBI registered expert",
      "WhatsApp group for investors", "exclusive investment", "double your money",
      "trading tips", "insider info", "guaranteed profit", "stock tips", "insider info",
      "300% return", "crypto investment", "trading group", "whatsapp stock group", "elites group"
    ],
    explanation: "Fake investment scheme promising high returns. Victims are added to WhatsApp groups with fake testimonials before being robbed."
  },
  {
    name: "Sextortion Opener",
    severity: "HIGH_RISK",
    triggers: [
      "nude video", "compromising video", "pay or we publish", "your photos with",
      "we have recorded you", "pay via UPI or bitcoin", "blackmail", "video call recorded",
      "nude video", "pay money or leak", "police complaint", "social media leak"
    ],
    explanation: "Scammers claim to have compromising videos and threaten to share them. Never pay — it only escalates demands."
  },
  {
    name: "Fake Loan Offer",
    severity: "SUSPICIOUS",
    triggers: [
      "instant loan approved", "no documents required", "loan without CIBIL",
      "pre-approved loan", "pay processing fee first", "loan disbursed after fee",
      "loan approved", "no document loan", "instant credit", "processing fee",
      "low interest loan", "personal loan offer"
    ],
    explanation: "Fake lenders collect advance 'processing fees' and then disappear. Legitimate lenders never charge upfront fees."
  },
  {
    name: "Lottery / Prize Scam",
    severity: "SUSPICIOUS",
    triggers: [
      "you have won", "lottery winner", "prize money", "claim your prize",
      "selected winner", "pay tax to claim", "KBC winner", "lucky draw",
      "kbc lottery", "won 25 lakhs", "prize winner", "lucky draw", "claim reward",
      "whatsapp lottery"
    ],
    explanation: "Fake lottery/KBC prize claiming you've won. Victims are asked to pay 'taxes' or 'fees' to claim non-existent prizes."
  },
  {
    name: "OTP / Screen Share Scam",
    severity: "CRITICAL",
    triggers: [
      "share your OTP", "tell me the OTP", "install AnyDesk", "install TeamViewer",
      "screen share", "remote access", "give me OTP to verify", "RustDesk",
      "anydesk", "teamviewer", "screen share", "share otp", "customer care",
      "technical support"
    ],
    explanation: "No legitimate organization ever asks for your OTP. Scammers use remote access tools to control your device and drain accounts."
  }
];

export function findPatternMatch(text: string) {
  const textLower = text.toLowerCase();
  let bestMatch: Pattern | null = null;
  let maxTriggers = 0;

  for (const pattern of PATTERNS) {
    const count = pattern.triggers.filter(t => textLower.includes(t.toLowerCase())).length;
    if (count > maxTriggers) {
      maxTriggers = count;
      bestMatch = pattern;
    }
  }

  if (maxTriggers > 0 && bestMatch) {
    return {
      matched: true,
      ...bestMatch,
      matchCount: maxTriggers
    };
  }

  return { matched: false };
}
