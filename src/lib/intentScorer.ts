export interface IntentScores {
  urgencyScore: number;
  financialScore: number;
  employmentScore: number;
  combined: number;
}

export function scoreIntent(text: string): IntentScores {
  const textLower = text.toLowerCase();
  
  // Urgency signals (40% weight)
  const urgencyWords = [
    "immediately", "24 hours", "blocked", "arrest warrant", "urgent", 
    "abhi", "turant", "band ho jayega", "suspended", "last chance",
    "within 1 hour", "final notice", "police case", "legal action"
  ];
  
  // Financial/Data Pressure signals (40% weight)
  const financialWords = [
    "otp", "upi pin", "transfer", "rupees", "₹", "fee", "charge",
    "payment", "bank details", "credit card", "cvv", "expiry date",
    "refund", "cashback", "reward", "lottery", "prize"
  ];
  
  // Employment Fraud Traps (20% weight)
  const employmentWords = [
    "security deposit", "registration fee", "task completion", "offer letter fee",
    "laptop deposit", "id card fee", "training fee", "work from home",
    "youtube likes", "instagram likes", "daily payout", "telegram group"
  ];

  const calculateScore = (keywords: string[]) => {
    let count = 0;
    keywords.forEach(keyword => {
      if (textLower.includes(keyword)) {
        count++;
      }
    });
    // Scale count to 0-100 score
    return Math.min(count * 25, 100);
  };

  const urgencyScore = calculateScore(urgencyWords);
  const financialScore = calculateScore(financialWords);
  const employmentScore = calculateScore(employmentWords);

  // Combined score with weights
  const combined = Math.min(
    (urgencyScore * 0.4) + (financialScore * 0.4) + (employmentScore * 0.2),
    100
  );

  return {
    urgencyScore,
    financialScore,
    employmentScore,
    combined
  };
}
