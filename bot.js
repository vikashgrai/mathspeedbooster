import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import http from 'http';

dotenv.config();
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

const users = {};

function generateQuestion(mode) {
  let a, b, question, answer;

  if (mode === "add") {
    a = Math.floor(100 + Math.random() * 900); // 3-digit
    b = Math.floor(10 + Math.random() * 90);   // 2-digit
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

  bot.sendMessage(chatId, `👋 Hello ${name}!\nWelcome to the *Calculation Speed Booster Bot*!`, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "🚀 Start", callback_data: "start_quiz" }]
      ]
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
    user.mode = mode;
    user.questions = [];
    user.answers = [];
    user.current = 0;
    user.score = 0;

    bot.sendMessage(chatId,
      `📚 *${mode.charAt(0).toUpperCase() + mode.slice(1)} Mode*\nThis quiz contains *10 questions*.\n⏱ You have *30 seconds* for each question.\n\nReady?`,
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "✅ Start Now", callback_data: "begin_quiz" }]
          ]
        }
      }
    );
  }

  if (data === "begin_quiz") {
    sendQuestion(chatId);
  }

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
      `🎉 Quiz Complete!\n✅ Score: ${user.score}/10\n📊 Accuracy: ${percent}%`,
      {
        reply_markup: {
          inline_keyboard: [[{ text: "🔁 Play Again", callback_data: "play_again" }]]
        }
      }
    );
    return;
  }

  const { question, answer } = generateQuestion(user.mode);
  user.questions.push(question);
  user.answers.push(answer);
  user.currentAnswer = answer;
  user.awaiting = true;

  bot.sendMessage(chatId, `🧠 Q${user.current + 1}: ${question}\n⏳ You have 30 seconds...`);

  // Start 30-second timer
  setTimeout(() => {
    if (user.awaiting) {
      user.awaiting = false;
      user.current++;
      bot.sendMessage(chatId, `⏰ Time’s up! The correct answer was *${answer}*`, { parse_mode: "Markdown" });
      sendQuestion(chatId);
    }
  }, 30000);
}

bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  const user = users[chatId];

  if (!user || !user.awaiting) return;

  const guess = parseInt(msg.text);
  const correct = user.currentAnswer;

  user.awaiting = false;
  user.current++;

  if (guess === correct) {
    user.score++;
    bot.sendMessage(chatId, `✅ Correct!`);
  } else {
    bot.sendMessage(chatId, `❌ Wrong! The correct answer was *${correct}*`, { parse_mode: "Markdown" });
  }

  setTimeout(() => sendQuestion(chatId), 500);
});

// ➤ Keep alive server for Render
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot is alive!');
}).listen(process.env.PORT || 3000);
