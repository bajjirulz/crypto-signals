import express from "express";
import axios from "axios";
import bodyParser from "body-parser";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(bodyParser.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const PORT = process.env.PORT || 3000;

// 🧠 helper to send message to Telegram
async function sendToTelegram(message) {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  try {
    await axios.post(url, {
      chat_id: CHAT_ID,
      text: message,
      parse_mode: "Markdown"
    });
    console.log("✅ Sent to Telegram");
  } catch (err) {
    console.error("❌ Telegram send failed:", err.response?.data || err.message);
  }
}

// 🪄 endpoint for TradingView webhook
app.post("/signal", async (req, res) => {
  try {
    const data = req.body;
    const pair = data.pair || "N/A";
    const tf = data.timeframe || "—";
    const signal = data.signal || "—";
    const conf = data.confidence || "—";
    const tp = data.tp || "—";
    const sl = data.sl || "—";

    // 🟢 choose emoji based on signal
    const sigEmoji = signal.toUpperCase().includes("BUY") ? "🟢" :
                     signal.toUpperCase().includes("SELL") ? "🔴" : "⚪️";

    const message = `📊 *${pair}* (${tf})\nSignal: ${sigEmoji} *${signal.toUpperCase()}*\nConfidence: *${conf}%*\nTP: ${tp}\nSL: ${sl}\n\n#CryptoSignalBot`;

    await sendToTelegram(message);

    res.json({ status: "ok", sent: true });
  } catch (err) {
    console.error("Error processing signal:", err);
    res.status(500).json({ error: "Failed to process signal" });
  }
});

// root test endpoint
app.get("/", (req, res) => res.send("✅ Crypto Signal Bot Running"));

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
