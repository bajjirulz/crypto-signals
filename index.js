import express from "express";
import axios from "axios";
import bodyParser from "body-parser";
import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(bodyParser.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const PORT = process.env.PORT || 3000;

// 🧠 In-memory database (you can replace this with MongoDB or Redis)
const signalStore = {}; // e.g. { "BTCUSDT_1h": { signal, confidence, tp, sl, time } }

// 🔹 Telegram Bot setup
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
console.log("🤖 Telegram bot running...");

// 🔹 Utility to send message to Telegram
async function sendToTelegram(message, chatId = CHAT_ID) {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  await axios.post(url, {
    chat_id: chatId,
    text: message,
    parse_mode: "Markdown"
  });
}

// ========== WEBHOOK ENDPOINT (TradingView → Telegram) ==========
app.post("/signal", async (req, res) => {
  try {
    const { pair, timeframe, signal, confidence, tp, sl } = req.body;

    // Build message
    const key = `${pair}_${timeframe}`;
    signalStore[key] = {
      pair,
      timeframe,
      signal,
      confidence,
      tp,
      sl,
      time: new Date().toISOString()
    };

    const sigEmoji =
      signal?.toUpperCase().includes("BUY") ? "🟢" :
      signal?.toUpperCase().includes("SELL") ? "🔴" : "⚪️";

    const msg = `📊 *${pair}* (${timeframe})\nSignal: ${sigEmoji} *${signal.toUpperCase()}*\nConfidence: *${confidence}%*\nTP: ${tp}\nSL: ${sl}\n🕒 ${new Date().toLocaleString()}\n\n#CryptoSignalBot`;

    await sendToTelegram(msg);
    console.log(`✅ Signal stored & sent for ${key}`);
    res.json({ status: "ok" });
  } catch (err) {
    console.error("❌ Webhook error:", err.message);
    res.status(500).json({ error: "Failed" });
  }
});

// ========== TELEGRAM COMMAND HANDLER ==========
bot.onText(/\/signal (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const args = match[1].split(" ");
  if (args.length < 2) {
    bot.sendMessage(chatId, "❗️Usage: `/signal BTCUSDT 1h`", { parse_mode: "Markdown" });
    return;
  }

  const pair = args[0].toUpperCase();
  const tf = args[1];
  const key = `${pair}_${tf}`;
  const data = signalStore[key];

  if (data) {
    const sigEmoji =
      data.signal?.toUpperCase().includes("BUY") ? "🟢" :
      data.signal?.toUpperCase().includes("SELL") ? "🔴" : "⚪️";

    const reply = `📊 *${data.pair}* (${data.timeframe})\nSignal: ${sigEmoji} *${data.signal.toUpperCase()}*\nConfidence: *${data.confidence}%*\nTP: ${data.tp}\nSL: ${data.sl}\nLast Update: ${new Date(data.time).toLocaleString()}\n\n#LiveSignal`;
    await bot.sendMessage(chatId, reply, { parse_mode: "Markdown" });
  } else {
    await bot.sendMessage(chatId, `⚠️ No signal found for ${pair} (${tf})\n\nWait for the next TradingView alert or trigger one manually.`, { parse_mode: "Markdown" });
  }
});

// Default reply for unknown messages
bot.on("message", (msg) => {
  const text = msg.text;
  if (!text.startsWith("/signal")) {
    bot.sendMessage(msg.chat.id, "💡 Try: `/signal BTCUSDT 1h`", { parse_mode: "Markdown" });
  }
});

// ========== EXPRESS SERVER ==========
app.get("/", (req, res) => res.send("✅ Crypto Signal Bot v2.0 Online"));
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
