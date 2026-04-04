import axios from "axios";
import html2canvas from "html2canvas";
import { AlertTriangle, ArrowLeft, CheckCircle, ChevronDown, ChevronUp, Download, ExternalLink, Globe, Info, Loader2, MessageSquare, MousePointer2, Shield, ShieldAlert, ShieldCheck, Upload, Zap } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Language, languages, translations } from "./lib/i18n";
import { findPatternMatch, detectForwarded } from "./lib/patterns";
import { recentScams } from "./lib/recentScams";
import { analyzeSemantic } from "./lib/localAI";
import { scoreIntent, IntentScores } from "./lib/intentScorer";

type AppState = "input" | "loading" | "results";

const MIN_LOADING_TIME = 2500;

interface AnalysisResult {
  risk_level: "SAFE" | "SUSPICIOUS" | "HIGH_RISK" | "CRITICAL";
  scam_type: string;
  confidence: number;
  tactics_used: string[];
  red_flags: string[];
  plain_language_explanation: string;
  action_checklist: string[];
  intentScores?: IntentScores;
  isWhatsappForward?: boolean;
  urlInfo?: {
    originalUrl: string;
    finalUrl: string;
    isSafe: boolean;
    threatType: string | null;
  };
}

// Custom Hook for Reveal on Scroll
function useRevealOnScroll() {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, []);

  return { ref, isVisible };
}

// Cursor Glow Component
function CursorGlow() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    checkMobile();

    const handleMouseMove = (e: MouseEvent) => {
      if (isMobile) return;
      setPosition({ x: e.clientX, y: e.clientY });
    };

    document.addEventListener("mousemove", handleMouseMove);
    return () => document.removeEventListener("mousemove", handleMouseMove);
  }, [isMobile]);

  if (isMobile) return null;

  return (
    <div 
      className="cursor-glow"
      style={{ 
        transform: `translate(${position.x - 120}px, ${position.y - 120}px)` 
      }}
    />
  );
}

// Liquid Wave Component
function LiquidWave({ riskLevel }: { riskLevel: string }) {
  const fillLevel = useMemo(() => {
    switch (riskLevel) {
      case "SAFE": return "8%";
      case "SUSPICIOUS": return "45%";
      case "HIGH_RISK": return "75%";
      case "CRITICAL": return "95%";
      default: return "0%";
    }
  }, [riskLevel]);

  const waveClass = useMemo(() => {
    switch (riskLevel) {
      case "SAFE": return "animate-wave opacity-20";
      case "SUSPICIOUS": return "animate-wave opacity-40";
      case "HIGH_RISK": return "animate-wave-fast opacity-60";
      case "CRITICAL": return "animate-wave-fast opacity-80";
      default: return "";
    }
  }, [riskLevel]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div 
        className={`absolute bottom-0 left-0 w-[200%] h-full bg-accent-red transition-all duration-1000 ease-in-out ${waveClass}`}
        style={{ 
          height: fillLevel,
          clipPath: "path('M0 20 C 50 10 150 30 200 20 L 200 100 L 0 100 Z')"
        }}
      />
    </div>
  );
}

export default function App() {
  const [state, setState] = useState<AppState>("input");
  const [inputText, setInputText] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem("clearalert_lang");
    return (saved as Language) || "en";
  });
  const [showProactive, setShowProactive] = useState(false);
  const [threatStatIndex, setThreatStatIndex] = useState(0);
  const [isDemo, setIsDemo] = useState(false);
  const [pasteHint, setPasteHint] = useState<string | null>(null);
  const [isWhatsappForward, setIsWhatsappForward] = useState(false);
  const [analyzeButtonState, setAnalyzeButtonState] = useState<'idle' | 'morphing' | 'loading' | 'done'>('idle');

  const t = translations[lang];
  const reportRef = useRef<HTMLDivElement>(null);
  const { ref: revealRef, isVisible: isRevealVisible } = useRevealOnScroll();

  const threatStats = [
    "₹1,750 Cr lost to cybercrime in Q1 2024",
    "Digital Arrest scams up by 300% this month",
    "1930: National Cybercrime Helpline"
  ];

  useEffect(() => {
    localStorage.setItem("clearalert_lang", lang);
  }, [lang]);

  useEffect(() => {
    const interval = setInterval(() => {
      setThreatStatIndex((prev) => (prev + 1) % threatStats.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("demo") === "1") {
      setIsDemo(true);
      setInputText("URGENT: You are under Digital Arrest. CBI has found illegal narcotics in a parcel sent in your name. Stay on this video call. Do not tell anyone or you will be jailed immediately. Pay ₹50,000 for verification to clear your name.");
    }
  }, []);

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text");
    const isForwarded = detectForwarded(text);
    setIsWhatsappForward(isForwarded);

    const match = findPatternMatch(text);
    if (match.matched && 'name' in match) {
      setPasteHint(`⚠ Possible ${match.name} detected`);
    } else if (text.length > 10) {
      setPasteHint("✓ Looks safe so far");
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = useCallback(async () => {
    if (!inputText && !image) {
      alert(t.errorProvideInput);
      return;
    }

    setAnalyzeButtonState('morphing');
    setTimeout(() => setAnalyzeButtonState('loading'), 300);
    
    // We'll set the app state to loading after the button morphs
    setTimeout(() => {
      setState("loading");
      setLoadingStep(0);
    }, 500);

    const startTime = Date.now();

    try {
      // Parallel execution of checks
      const [semanticResult, intentResult, urlResult] = await Promise.all([
        analyzeSemantic(inputText),
        scoreIntent(inputText),
        (async () => {
          const urlRegex = /(https?:\/\/[^\s]+)/g;
          const urls = inputText.match(urlRegex);
          if (urls && urls.length > 0) {
            try {
              const res = await axios.post("/api/resolve-url", { url: urls[0] });
              return res.data;
            } catch (e) {
              console.warn("URL check failed", e);
              return null;
            }
          }
          return null;
        })(),
        new Promise(r => setTimeout(r, MIN_LOADING_TIME)) // Minimum loading time
      ]);

      const patternMatch = findPatternMatch(inputText);
      
      // Merge all signals to determine final result
      let risk_level: "SAFE" | "SUSPICIOUS" | "HIGH_RISK" | "CRITICAL" = "SAFE";
      let scam_type = "Safe / Legitimate";
      let confidence = 40;
      const red_flags: string[] = [];
      const tactics: string[] = [];

      if (patternMatch.matched && 'severity' in patternMatch) {
        risk_level = patternMatch.severity as any;
        scam_type = patternMatch.name;
        confidence = 70;
        red_flags.push("Matches known scam pattern database");
      }

      if (semanticResult.matched) {
        if (risk_level === "SAFE") risk_level = "HIGH_RISK";
        scam_type = semanticResult.closestMatch.split(".")[0]; // Use first sentence as type
        confidence = Math.max(confidence, Math.round(semanticResult.similarity * 100));
        red_flags.push("Semantic similarity to known scam templates detected");
      }

      if (intentResult.combined > 65) {
        if (risk_level === "SAFE" || risk_level === "SUSPICIOUS") risk_level = "HIGH_RISK";
        confidence = Math.max(confidence, intentResult.combined);
        red_flags.push("High urgency and financial pressure detected in language");
      }

      if (urlResult && !urlResult.isSafe) {
        risk_level = "CRITICAL";
        scam_type = "Phishing / Malicious URL";
        confidence = 95;
        red_flags.push(`Malicious URL detected: ${urlResult.threatType}`);
      }

      if (isWhatsappForward) {
        confidence = Math.min(confidence + 15, 100);
        red_flags.push("Highly circulated message (WhatsApp Forward)");
      }

      // Final adjustment
      if (confidence > 85 && risk_level !== "CRITICAL") risk_level = "HIGH_RISK";
      if (confidence > 95) risk_level = "CRITICAL";

      const finalResult: AnalysisResult = {
        risk_level,
        scam_type,
        confidence,
        tactics_used: tactics.length > 0 ? tactics : ["Social Engineering", "Urgency Manipulation"],
        red_flags: red_flags.length > 0 ? red_flags : ["Unusual message structure"],
        plain_language_explanation: semanticResult.matched 
          ? `This message is very similar to a known scam: "${semanticResult.closestMatch}". It uses urgency and pressure to manipulate you.`
          : "Our local AI has analyzed the intent and patterns of this message. It shows characteristics common in cybercrime attempts.",
        action_checklist: ["Do not click any links", "Do not share OTP", "Report to 1930", "Block the sender"],
        intentScores: intentResult,
        isWhatsappForward,
        urlInfo: urlResult
      };

      requestAnimationFrame(() => {
        setResult(finalResult);
        setState("results");
        setAnalyzeButtonState('done');
      });
    } catch (error) {
      console.error(error);
      setState("input");
      setAnalyzeButtonState('idle');
      alert("Analysis failed. Please try again.");
    }
  }, [inputText, image, t, lang, isWhatsappForward]);

  const handleShare = async () => {
    try {
      if (reportRef.current) {
        const canvas = await html2canvas(reportRef.current, {
          backgroundColor: "#0A0A0A",
          scale: 2,
        });
        const link = document.createElement("a");
        link.download = `ClearAlert-Report-${Date.now()}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      }
    } catch (error) {
      console.error("Share failed:", error);
      alert("Sharing is not supported on this browser.");
    }
  };

  return (
    <div className="min-h-screen bg-bg text-white selection:bg-accent-red selection:text-white overflow-x-hidden" lang={lang}>
      <CursorGlow />
      
      {/* Header */}
      <header className="border-b border-white/10 bg-bg/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-accent-red rounded-lg flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-syne font-bold text-xl tracking-tighter">CLEAR<span className="text-accent-red">ALERT</span></h1>
          </div>
          
          <div className="hidden md:flex items-center gap-4 text-[10px] font-mono text-white/40 uppercase tracking-widest">
            <AnimatePresence mode="wait">
              <motion.span
                key={threatStatIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-accent-gold"
              >
                {threatStats[threatStatIndex]}
              </motion.span>
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-full border border-white/10">
            {languages.map((l) => (
              <button
                key={l.code}
                onClick={() => setLang(l.code as Language)}
                className={`px-2 py-1 rounded-full text-[10px] font-bold transition-all ${
                  lang === l.code ? "bg-accent-red text-white" : "text-white/40 hover:text-white"
                }`}
              >
                {l.name}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        <AnimatePresence mode="wait">
          {state === "input" && (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-8"
            >
              {isDemo && (
                <div className="bg-accent-gold/20 border border-accent-gold/30 p-3 rounded-xl flex items-center gap-3 animate-pulse">
                  <Zap className="w-5 h-5 text-accent-gold" />
                  <span className="text-xs font-bold text-accent-gold uppercase tracking-wider">{t.demoMode}</span>
                </div>
              )}

              <div className="text-center space-y-4">
                <h2 className="text-4xl md:text-6xl font-syne font-extrabold tracking-tight leading-none">
                  {t.tagline}
                </h2>
              </div>

              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-accent-red to-accent-gold rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                <div className="relative bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm glass">
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onPaste={handlePaste}
                    placeholder={t.inputPlaceholder}
                    className="w-full h-48 md:h-64 p-6 bg-transparent border-none focus:ring-0 text-lg md:text-xl font-sans resize-none placeholder:text-white/20"
                  />
                  
                  <div className="px-6 py-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-xs font-mono text-white/40 hover:text-white cursor-pointer transition-colors">
                        <Upload className="w-4 h-4" />
                        <span>{t.screenshot}</span>
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                      </label>
                      <button className="flex items-center gap-2 text-xs font-mono text-white/40 hover:text-white transition-colors">
                        <ExternalLink className="w-4 h-4" />
                        <span>{t.urlCheck}</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {pasteHint && (
                        <span className={`text-[10px] font-bold px-2 py-1 rounded border ${
                          pasteHint.includes("✓") ? "bg-safe/10 border-safe/30 text-safe" : "bg-accent-red/10 border-accent-red/30 text-accent-red"
                        }`}>
                          {pasteHint}
                        </span>
                      )}
                      {isWhatsappForward && (
                        <span className="text-[10px] font-bold px-2 py-1 rounded bg-accent-gold/10 border border-accent-gold/30 text-accent-gold">
                          {t.whatsappForward}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-center">
                <button
                  onClick={handleAnalyze}
                  disabled={(!inputText && !image) || analyzeButtonState !== 'idle'}
                  className={`relative font-syne font-black text-2xl tracking-tighter transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center justify-center gap-3 overflow-hidden ${
                    analyzeButtonState === 'idle' 
                      ? "w-full py-6 rounded-2xl bg-accent-red hover:bg-red-600 shadow-lg shadow-accent-red/20 active:scale-[0.98]" 
                      : "w-20 h-20 rounded-full bg-accent-red"
                  } ${(!inputText && !image) && analyzeButtonState === 'idle' ? "opacity-20 cursor-not-allowed" : "opacity-100"}`}
                >
                  {analyzeButtonState === 'idle' ? (
                    <>
                      <Zap className="w-6 h-6 fill-current" />
                      {t.analyzeNow}
                    </>
                  ) : (
                    <Loader2 className="w-8 h-8 animate-spin" />
                  )}
                </button>
              </div>

              {/* Proactive Panel */}
              <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden glass">
                <button 
                  onClick={() => setShowProactive(!showProactive)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <MousePointer2 className="w-5 h-5 text-accent-gold" />
                    <span className="font-syne font-bold text-sm tracking-tight uppercase">{t.proactiveTitle}</span>
                  </div>
                  {showProactive ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
                <AnimatePresence>
                  {showProactive && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-6 space-y-4 border-t border-white/5 pt-4">
                        {[t.proactiveStep1, t.proactiveStep2, t.proactiveStep3].map((step, i) => (
                          <div key={i} className="flex gap-4 items-start">
                            <div className="w-6 h-6 rounded-full bg-accent-gold/10 flex items-center justify-center shrink-0 mt-0.5">
                              <span className="text-[10px] font-bold text-accent-gold">{i + 1}</span>
                            </div>
                            <p className="text-sm text-white/60 leading-relaxed">{step}</p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Scam Feed */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Live Threat Intelligence</h3>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-accent-red rounded-full animate-pulse"></div>
                    <span className="text-[10px] font-mono text-accent-red uppercase">Live</span>
                  </div>
                </div>
                <div className="relative overflow-hidden bg-white/5 border border-white/10 rounded-xl h-12 flex items-center glass">
                  <motion.div
                    animate={{ x: ["0%", "-50%"] }}
                    transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                    className="flex whitespace-nowrap gap-8 px-4"
                  >
                    {[...recentScams, ...recentScams].map((scam, i) => (
                      <div key={i} className="flex items-center gap-2 text-[10px] font-mono">
                        <span className="text-accent-gold">[{scam.type}]</span>
                        <span className="text-white/60">{scam.trigger}</span>
                        <span className="text-white/20">|</span>
                      </div>
                    ))}
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}

          {state === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 space-y-12"
            >
              <div className="relative">
                <div className="w-32 h-32 border-4 border-white/5 rounded-full"></div>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 w-32 h-32 border-4 border-t-accent-red border-r-transparent border-b-transparent border-l-transparent rounded-full"
                ></motion.div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Shield className="w-12 h-12 text-accent-red animate-pulse" />
                </div>
              </div>

              <div className="space-y-6 w-full max-w-xs">
                {[t.loadingPatterns, t.loadingAI, t.loadingURL].map((step, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className={`w-2 h-2 rounded-full transition-colors duration-500 ${
                      loadingStep > i ? "bg-safe" : loadingStep === i ? "bg-accent-red animate-pulse" : "bg-white/10"
                    }`}></div>
                    <span className={`text-sm font-mono tracking-tight transition-colors duration-500 ${
                      loadingStep >= i ? "text-white" : "text-white/20"
                    }`}>
                      {step}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {state === "results" && result && (
            <motion.div
              key="results"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    setState("input");
                    setAnalyzeButtonState('idle');
                  }}
                  className="flex items-center gap-2 text-xs font-mono text-white/40 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>{t.backButton}</span>
                </button>
                <button
                  onClick={handleShare}
                  className="flex items-center gap-2 text-xs font-mono bg-white/5 border border-white/10 px-4 py-2 rounded-full hover:bg-white/10 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>{t.shareButton}</span>
                </button>
              </div>

              <div ref={reportRef} className="space-y-8 p-1">
                {/* Risk Banner */}
                <div className={`p-8 rounded-3xl border-2 flex flex-col items-center text-center space-y-4 relative overflow-hidden glass ${
                  result.risk_level === "SAFE" ? "border-safe/30" :
                  result.risk_level === "SUSPICIOUS" ? "border-suspicious/30" :
                  "border-critical/30"
                }`}>
                  <LiquidWave riskLevel={result.risk_level} />
                  
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center relative z-10 ${
                    result.risk_level === "SAFE" ? "bg-safe text-white" :
                    result.risk_level === "SUSPICIOUS" ? "bg-suspicious text-white" :
                    "bg-critical text-white"
                  }`}>
                    {result.risk_level === "SAFE" ? <ShieldCheck className="w-10 h-10" /> : <ShieldAlert className="w-10 h-10" />}
                  </div>

                  <div className="relative z-10">
                    <span className="text-[10px] font-mono uppercase tracking-[0.3em] opacity-60">{t.riskLevel}</span>
                    <h3 className={`text-5xl md:text-7xl font-syne font-black tracking-tighter ${
                      result.risk_level === "SAFE" ? "text-safe" :
                      result.risk_level === "SUSPICIOUS" ? "text-suspicious" :
                      "text-critical"
                    }`}>
                      {t[result.risk_level.toLowerCase() as keyof typeof t] || result.risk_level}
                    </h3>
                  </div>

                  <div className="flex items-center gap-6 relative z-10">
                    <div className="text-center">
                      <div className="text-[10px] font-mono text-white/40 uppercase mb-1">{t.confidence}</div>
                      <div className="text-xl font-bold font-mono">
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 1, delay: 0.5 }}
                        >
                          {result.confidence}%
                        </motion.span>
                      </div>
                    </div>
                    <div className="w-px h-8 bg-white/10"></div>
                    <div className="text-center">
                      <div className="text-[10px] font-mono text-white/40 uppercase mb-1">{t.scamTypeDetected}</div>
                      <div className="text-xl font-bold">{result.scam_type}</div>
                    </div>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid md:grid-cols-2 gap-6" ref={revealRef}>
                  <motion.div 
                    initial={{ opacity: 0, y: 16 }}
                    animate={isRevealVisible ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="bg-white/5 border border-white/10 p-6 rounded-2xl space-y-4 glass"
                  >
                    <div className="flex items-center gap-2 text-accent-gold">
                      <Info className="w-5 h-5" />
                      <h4 className="font-syne font-bold text-sm uppercase tracking-tight">{t.whatsHappening}</h4>
                    </div>
                    <p className="text-white/70 leading-relaxed text-sm">
                      {result.plain_language_explanation}
                    </p>
                  </motion.div>

                  <motion.div 
                    initial={{ opacity: 0, y: 16 }}
                    animate={isRevealVisible ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="bg-white/5 border border-white/10 p-6 rounded-2xl space-y-4 glass"
                  >
                    <div className="flex items-center gap-2 text-accent-red">
                      <AlertTriangle className="w-5 h-5" />
                      <h4 className="font-syne font-bold text-sm uppercase tracking-tight">{t.redFlags}</h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {result.red_flags.map((flag, i) => (
                        <motion.span
                          key={i}
                          initial={{ opacity: 0, scale: 0.85, y: 6 }}
                          animate={isRevealVisible ? { opacity: 1, scale: 1, y: 0 } : {}}
                          transition={{ 
                            duration: 0.4, 
                            delay: 0.3 + (i * 0.04),
                            ease: [0.34, 1.56, 0.64, 1]
                          }}
                          className="px-3 py-1 bg-accent-red/10 border border-accent-red/20 rounded-full text-[10px] text-accent-red font-bold"
                        >
                          {flag}
                        </motion.span>
                      ))}
                    </div>
                  </motion.div>
                </div>

                {/* Action Checklist */}
                <motion.div 
                  initial={{ opacity: 0, y: 16 }}
                  animate={isRevealVisible ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="bg-white/5 border border-white/10 p-8 rounded-3xl space-y-6 glass"
                >
                  <div className="flex items-center gap-2 text-safe">
                    <CheckCircle className="w-6 h-6" />
                    <h4 className="font-syne font-bold text-lg uppercase tracking-tight">{t.whatToDoNow}</h4>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    {result.action_checklist.map((action, i) => (
                      <motion.div 
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={isRevealVisible ? { opacity: 1, x: 0 } : {}}
                        transition={{ duration: 0.3, delay: 0.4 + (i * 0.08) }}
                        className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/5"
                      >
                        <div className="w-6 h-6 rounded-full bg-safe/20 flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-bold text-safe">{i + 1}</span>
                        </div>
                        <span className="text-sm font-medium text-white/80">{action}</span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </div>

              <footer className="text-center py-8">
                <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest leading-loose">
                  {t.disclaimer}
                </p>
              </footer>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating Support Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <button className="w-12 h-12 bg-white/5 border border-white/10 rounded-full flex items-center justify-center hover:bg-white/10 transition-all group glass">
          <MessageSquare className="w-5 h-5 text-white/40 group-hover:text-white" />
        </button>
      </div>
    </div>
  );
}
