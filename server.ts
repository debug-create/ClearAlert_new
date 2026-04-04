import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3001;

  app.use(cors());
  app.use(express.json());

  // API Route for Google Safe Browsing
  app.post("/api/check-url", async (req, res) => {
    const { url } = req.body;
    const apiKey = process.env.GOOGLE_SAFE_BROWSING_API_KEY;

    if (!apiKey) {
      return res.json({ safe: true, warning: "Safe Browsing API key not configured" });
    }

    try {
      const payload = {
        client: { clientId: "clearalert", clientVersion: "1.0" },
        threatInfo: {
          threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
          platformTypes: ["ANY_PLATFORM"],
          threatEntryTypes: ["URL"],
          threatEntries: [{ url }]
        }
      };

      const response = await axios.post(
        `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`,
        payload
      );

      if (response.data.matches) {
        return res.json({ 
          safe: false, 
          threatType: response.data.matches[0].threatType 
        });
      }

      return res.json({ safe: true });
    } catch (error) {
      console.error("Safe Browsing Error:", error);
      return res.status(500).json({ error: "Failed to check URL" });
    }
  });

  // API Route for URL Redirect Unrolling
  app.post("/api/resolve-url", async (req, res) => {
    const { url } = req.body;
    let currentUrl = url;
    const redirectChain = [url];
    let redirectCount = 0;
    const maxRedirects = 5;

    try {
      while (redirectCount < maxRedirects) {
        const response = await axios.get(currentUrl, {
          maxRedirects: 0,
          validateStatus: (status) => status >= 200 && status < 400,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          }
        });

        if (response.status >= 300 && response.status < 400 && response.headers.location) {
          const nextUrl = new URL(response.headers.location, currentUrl).href;
          currentUrl = nextUrl;
          redirectChain.push(currentUrl);
          redirectCount++;
        } else {
          break;
        }
      }

      // Check the final URL against Safe Browsing
      const apiKey = process.env.GOOGLE_SAFE_BROWSING_API_KEY;
      let isSafe = true;
      let threatType = null;

      if (apiKey) {
        const payload = {
          client: { clientId: "clearalert", clientVersion: "1.0" },
          threatInfo: {
            threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
            platformTypes: ["ANY_PLATFORM"],
            threatEntryTypes: ["URL"],
            threatEntries: [{ url: currentUrl }]
          }
        };
        const sbResponse = await axios.post(
          `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`,
          payload
        );
        if (sbResponse.data.matches) {
          isSafe = false;
          threatType = sbResponse.data.matches[0].threatType;
        }
      }

      return res.json({
        originalUrl: url,
        finalUrl: currentUrl,
        redirectCount,
        redirectChain,
        isSafe,
        threatType
      });
    } catch (error) {
      console.error("URL Resolution Error:", error);
      return res.status(500).json({ error: "Failed to resolve URL" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
