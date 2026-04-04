export interface IntentScores {
  urgencyScore: number;
  financialPressureScore: number;
  employmentFraudScore: number;
  combined: number;
}

export function scoreIntent(text: string): IntentScores {
  const textLower = text.toLowerCase();
  
  // Urgency signals
  const urgencyKeywords = [
    "immediately", "24 hours", "blocked", "arrest warrant", "urgent", 
    "abhi", "turant", "band ho jayega", "suspended", "last chance",
    "within 1 hour", "final notice", "police case", "legal action"
  ];
  
  // Financial/Data Pressure signals
  const financialKeywords = [
    "otp", "upi pin", "transfer", "rupees", "₹", "fee", "charge",
    "payment", "bank details", "credit card", "cvv", "expiry date",
    "refund", "cashback", "reward", "lottery", "prize"
  ];
  
  // Employment Fraud Traps
  const employmentKeywords = [
    "security deposit", "registration fee", "task completion", "offer letter fee",
    "laptop deposit", "id card fee", "training fee", "work from home",
    "youtube likes", "instagram likes", "daily payout", "telegram group"
  ];

  const calculateScore = (keywords: string[]) => {
    let score = 0;
    keywords.forEach(keyword => {
      if (textLower.includes(keyword)) {
        score += 25; // Base score per keyword
      }
    });
    return Math.min(score, 100);
  };

  const urgencyScore = calculateScore(urgencyKeywords);
  const financialPressureScore = calculateScore(financialKeywords);
  const employmentFraudScore = calculateScore(employmentKeywords);

  // Combined score with weights
  const combined = Math.min(
    (urgencyScore * 0.4) + (financialPressureScore * 0.3) + (employmentFraudScore * 0.3),
    100
  );

  return {
    urgencyScore,
    financialPressureScore,
    employmentFraudScore,
    combined
  };
}
