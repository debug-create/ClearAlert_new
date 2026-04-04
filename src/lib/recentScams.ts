export interface RecentScam {
  id: string;
  date: string;
  type: string;
  description: string;
  trigger: string;
}

export const recentScams: RecentScam[] = [
  {
    id: "1",
    date: "2025-04-01",
    type: "Digital Arrest",
    description: "Scammers posing as CBI officers claiming drug parcels in your name.",
    trigger: "You are under digital arrest. Stay on call."
  },
  {
    id: "2",
    date: "2025-03-28",
    type: "UPI Refund",
    description: "Fake cashback offers requiring you to enter UPI PIN to 'receive' money.",
    trigger: "Enter PIN to receive ₹5000 cashback."
  },
  {
    id: "3",
    date: "2025-03-25",
    type: "KYC Block",
    description: "Bank account suspension threats via SMS with phishing links.",
    trigger: "Your SBI account will be blocked. Update KYC now."
  },
  {
    id: "4",
    date: "2025-03-20",
    type: "Job Offer",
    description: "Part-time YouTube like/comment jobs asking for security deposit.",
    trigger: "Earn ₹5000 daily by liking videos. Join now."
  },
  {
    id: "5",
    date: "2025-03-15",
    type: "FedEx Parcel",
    description: "Customs detention scam claiming illegal items found in your parcel.",
    trigger: "Your FedEx parcel is detained by customs."
  },
  {
    id: "6",
    date: "2025-03-10",
    type: "Stock Tips",
    description: "WhatsApp groups promising 300% returns on 'insider' stock tips.",
    trigger: "Join our VIP group for 100% guaranteed stock profit."
  }
];
