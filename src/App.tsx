import axios from "axios";
import html2canvas from "html2canvas";
import { AlertTriangle, ArrowLeft, CheckCircle, ChevronDown, ChevronUp, Download, ExternalLink, Globe, Info, Loader2, MessageSquare, MousePointer2, Shield, ShieldAlert, ShieldCheck, Upload, Zap } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { analyzeContent, AnalysisResult } from "./lib/gemini";
import { Language, languages, translations } from "./lib/i18n";
import { findPatternMatch } from "./lib/patterns";
import { recentScams } from "./lib/recentScams";

type AppState = "input" | "loading" | "results";

const MIN_LOADING_TIME = 2500;

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
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  const t = translations[lang];
  const reportRef = useRef<HTMLDivElement>(null);

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
    if (text.includes("Forwarded") || text.includes("forwarded many times")) {
      setIsWhatsappForward(true);
    } else {
      setIsWhatsappForward(false);
    }

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

    setState("loading");
    setLoadingStep(0);
    setIsOfflineMode(false);

    const startTime = Date.now();

    try {
      // Step 1: Pattern Match (Instant)
      setLoadingStep(0);
      const patternMatch = findPatternMatch(inputText);
      
      // Step 2: AI Analysis
      setLoadingStep(1);
      let aiResult: AnalysisResult;
      try {
        aiResult = await analyzeContent(inputText, image || undefined);
      } catch (err: any) {
        if (err.message === "OFFLINE_FALLBACK") {
          setIsOfflineMode(true);
          // Create a mock result based on pattern match
          aiResult = {
            risk_level: (patternMatch.matched && 'severity' in patternMatch) ? (patternMatch.severity as any) : "SUSPICIOUS",
            scam_type: (patternMatch.matched && 'name' in patternMatch) ? (patternMatch.name as any) : "Unidentified Threat",
            confidence: patternMatch.matched ? 75 : 40,
            tactics_used: patternMatch.matched ? ["Pattern Recognition"] : ["Unknown Tactics"],
            red_flags: patternMatch.matched ? ["Matches known scam database"] : ["Unusual message structure"],
            plain_language_explanation: (patternMatch.matched && 'explanation' in patternMatch) 
              ? patternMatch.explanation 
              : "AI analysis is currently unavailable. This message shows some suspicious characteristics based on local patterns.",
            action_checklist: ["Do not click any links", "Do not share OTP", "Report to 1930"]
          };
        } else {
          throw err;
        }
      }

      // Step 3: URL Check (if applicable)
      setLoadingStep(2);
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const urls = inputText.match(urlRegex);
      if (urls && urls.length > 0) {
        try {
          await axios.post("/api/check-url", { url: urls[0] });
        } catch (e) {
          console.warn("URL check failed", e);
        }
      }

      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, MIN_LOADING_TIME - elapsed);
      
      await new Promise(r => setTimeout(r, remaining));
      
      requestAnimationFrame(() => {
        setResult(aiResult);
        setState("results");
      });
    } catch (error) {
      console.error(error);
      setState("input");
      alert("Analysis failed. Please try again.");
    }
  }, [inputText, image, t, lang]);

  const handleShare = async () => {
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
  };

  return (
    <div className="min-h-screen bg-bg text-white selection:bg-accent-red selection:text-white overflow-x-hidden" lang={lang}>
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
                <div className="relative bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm">
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

              <button
                onClick={handleAnalyze}
                disabled={!inputText && !image}
                className={`w-full py-6 rounded-2xl font-syne font-black text-2xl tracking-tighter transition-all flex items-center justify-center gap-3 ${
                  inputText || image 
                    ? "bg-accent-red hover:bg-red-600 shadow-lg shadow-accent-red/20 active:scale-[0.98]" 
                    : "bg-white/5 text-white/20 cursor-not-allowed"
                } ${isDemo ? "animate-pulse" : ""}`}
              >
                <Zap className="w-6 h-6 fill-current" />
                {t.analyzeNow}
              </button>

              {/* Proactive Panel */}
              <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
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
                <div className="relative overflow-hidden bg-white/5 border border-white/10 rounded-xl h-12 flex items-center">
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
                  onClick={() => setState("input")}
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
                <div className={`p-8 rounded-3xl border-2 flex flex-col items-center text-center space-y-4 relative overflow-hidden ${
                  result.risk_level === "SAFE" ? "bg-safe/10 border-safe/30" :
                  result.risk_level === "SUSPICIOUS" ? "bg-suspicious/10 border-suspicious/30" :
                  "bg-critical/10 border-critical/30"
                }`}>
                  {isOfflineMode && (
                    <div className="absolute top-4 right-4 bg-white/10 px-2 py-1 rounded text-[8px] font-mono text-white/40 uppercase">
                      {t.patternOnly}
                    </div>
                  )}
                  
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
                    result.risk_level === "SAFE" ? "bg-safe text-white" :
                    result.risk_level === "SUSPICIOUS" ? "bg-suspicious text-white" :
                    "bg-critical text-white"
                  }`}>
                    {result.risk_level === "SAFE" ? <ShieldCheck className="w-10 h-10" /> : <ShieldAlert className="w-10 h-10" />}
                  </div>

                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-[0.3em] opacity-60">{t.riskLevel}</span>
                    <h3 className={`text-5xl md:text-7xl font-syne font-black tracking-tighter ${
                      result.risk_level === "SAFE" ? "text-safe" :
                      result.risk_level === "SUSPICIOUS" ? "text-suspicious" :
                      "text-critical"
                    }`}>
                      {t[result.risk_level.toLowerCase() as keyof typeof t] || result.risk_level}
                    </h3>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="text-[10px] font-mono text-white/40 uppercase mb-1">{t.confidence}</div>
                      <div className="text-xl font-bold">{result.confidence}%</div>
                    </div>
                    <div className="w-px h-8 bg-white/10"></div>
                    <div className="text-center">
                      <div className="text-[10px] font-mono text-white/40 uppercase mb-1">{t.scamTypeDetected}</div>
                      <div className="text-xl font-bold">{result.scam_type}</div>
                    </div>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-white/5 border border-white/10 p-6 rounded-2xl space-y-4">
                    <div className="flex items-center gap-2 text-accent-gold">
                      <Info className="w-5 h-5" />
                      <h4 className="font-syne font-bold text-sm uppercase tracking-tight">{t.whatsHappening}</h4>
                    </div>
                    <p className="text-white/70 leading-relaxed text-sm">
                      {result.plain_language_explanation}
                    </p>
                    {lang !== "en" && (
                      <p className="text-[10px] font-mono text-white/20 italic">
                        * {t.aiEnglishNote}
                      </p>
                    )}
                  </div>

                  <div className="bg-white/5 border border-white/10 p-6 rounded-2xl space-y-4">
                    <div className="flex items-center gap-2 text-accent-red">
                      <AlertTriangle className="w-5 h-5" />
                      <h4 className="font-syne font-bold text-sm uppercase tracking-tight">{t.redFlags}</h4>
                    </div>
                    <ul className="space-y-2">
                      {result.red_flags.map((flag, i) => (
                        <li key={i} className="flex gap-3 text-sm text-white/70">
                          <span className="text-accent-red font-mono">•</span>
                          {flag}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Action Checklist */}
                <div className="bg-white/5 border border-white/10 p-8 rounded-3xl space-y-6">
                  <div className="flex items-center gap-2 text-safe">
                    <CheckCircle className="w-6 h-6" />
                    <h4 className="font-syne font-bold text-lg uppercase tracking-tight">{t.whatToDoNow}</h4>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    {result.action_checklist.map((action, i) => (
                      <div key={i} className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/5">
                        <div className="w-6 h-6 rounded-full bg-safe/20 flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-bold text-safe">{i + 1}</span>
                        </div>
                        <span className="text-sm font-medium text-white/80">{action}</span>
                      </div>
                    ))}
                  </div>
                </div>
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
        <button className="w-12 h-12 bg-white/5 border border-white/10 rounded-full flex items-center justify-center hover:bg-white/10 transition-all group">
          <MessageSquare className="w-5 h-5 text-white/40 group-hover:text-white" />
        </button>
      </div>
    </div>
  );
}
