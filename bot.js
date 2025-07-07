// bot.js
import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import http from 'http';

dotenv.config();
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

const users = {};

function generateQuestion(mode) {
  let a, b, question, answer;

  if (mode === "add") {
    a = Math.floor(100 + Math.random() * 900);
    b = Math.floor(10 + Math.random() * 90);
    question = `${a} + ${b}`;
    answer = a + b;
  } else if (mode === "subtract") {
    a = Math.floor(100 + Math.random() * 900);
    b = Math.floor(10 + Math.random() * 90);
    question = `${a} - ${b}`;
    answer = a - b;
  } else if (mode === "multiply") {
    a = Math.floor(10 + Math.random() * 90);
    b = Math.floor(10 + Math.random() * 90);
    question = `${a} × ${b}`;
    answer = a * b;
  } else if (mode === "divide") {
    b = Math.floor(2 + Math.random() * 20);
    answer = Math.floor(2 + Math.random() * 10);
    a = b * answer;
    question = `${a} ÷ ${b}`;
  }

  return { question, answer };
}

bot.onText(/\/start/, (msg) => {
  const name = msg.from.first_name;
  const chatId = msg.chat.id;
  users[chatId] = { state: 'idle' };

  bot.sendMessage(chatId, `👋 Hello ${name}!
Welcome to the *Calculation Speed Booster Bot*!`, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [[{ text: "🚀 Start", callback_data: "start_quiz" }]]
    }
  });
});

bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;
  const user = users[chatId] || {};
  users[chatId] = user;

  if (data === "start_quiz") {
    user.state = 'selecting_mode';
    bot.sendMessage(chatId, `🎯 Choose your mode:`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "➕ Add", callback_data: "mode_add" }],
          [{ text: "➖ Subtract", callback_data: "mode_subtract" }],
          [{ text: "✖ Multiply", callback_data: "mode_multiply" }],
          [{ text: "➗ Divide", callback_data: "mode_divide" }]
        ]
      }
    });
  }

  if (data.startsWith("mode_")) {
    const mode = data.split("_")[1];
    Object.assign(user, {
      mode,
      questions: [],
      answers: [],
      current: 0,
      score: 0,
      awaiting: false,
    });

    bot.sendMessage(chatId,
      `📚 *${mode.charAt(0).toUpperCase() + mode.slice(1)} Mode*
This quiz contains *10 questions*.
⏱ Each question has *30 seconds*.

Ready?`, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [[{ text: "✅ Start Now", callback_data: "begin_quiz" }]]
      }
    });
  }

  if (data === "begin_quiz") sendQuestion(chatId);
  if (data === "play_again") {
    user.state = "selecting_mode";
    bot.sendMessage(chatId, `🎯 Choose your mode:`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "➕ Add", callback_data: "mode_add" }],
          [{ text: "➖ Subtract", callback_data: "mode_subtract" }],
          [{ text: "✖ Multiply", callback_data: "mode_multiply" }],
          [{ text: "➗ Divide", callback_data: "mode_divide" }]
        ]
      }
    });
  }

  bot.answerCallbackQuery(query.id);
});

function sendQuestion(chatId) {
  const user = users[chatId];
  if (user.current >= 10) {
    const percent = Math.round((user.score / 10) * 100);
    bot.sendMessage(chatId,
      `🎉 Quiz Complete!
✅ Score: ${user.score}/10
📊 Accuracy: ${percent}%`, {
        reply_markup: {
          inline_keyboard: [[{ text: "🔁 Play Again", callback_data: "play_again" }]]
        }
      });
    return;
  }

  const { question, answer } = generateQuestion(user.mode);
  Object.assign(user, {
    currentAnswer: answer,
    awaiting: true,
    timer: setTimeout(() => handleTimeout(chatId), 30000)
  });

  bot.sendMessage(chatId, `🧠 Q${user.current + 1}: *${question}*
⏳ You have 30 seconds!`, { parse_mode: "Markdown" });
}

function handleTimeout(chatId) {
  const user = users[chatId];
  if (!user.awaiting) return;
  user.awaiting = false;
  user.current++;
  bot.sendMessage(chatId, `⏰ Time's up, you slow 🐢 turtle!
Let's move on...`);
  setTimeout(() => sendQuestion(chatId), 1500);
}

bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  const user = users[chatId];

  if (!user || !user.awaiting) return;
  if (msg.text.startsWith("/")) return;

  clearTimeout(user.timer);
  user.awaiting = false;
  user.current++;

  const guess = parseInt(msg.text);
  const correct = user.currentAnswer;

  if (guess === correct) {
    user.score++;
    bot.sendMessage(chatId, `🚀 You're a fast 🐆 cheetah! Correct answer!`);
    setTimeout(() => sendQuestion(chatId), 1500);
  } else {
    bot.sendMessage(chatId, `❌ Oops! That's wrong.
The correct answer was *${correct}*`, { parse_mode: "Markdown" });
    setTimeout(() => sendQuestion(chatId), 15000);
  }
});

// Keep-alive HTTP server for Render
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot is alive!');
}).listen(process.env.PORT || 3000);
