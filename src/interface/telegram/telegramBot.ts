import "dotenv/config";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const API = `https://api.telegram.org/bot${TOKEN}`;

let offset = 0;

async function sendMessage(chatId: number, text: string) {
  await fetch(`${API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text
    })
  });
}

async function handle(update: any) {
  if (!update.message) return;

  const chatId = update.message.chat.id;
  const text = update.message.text;

  console.log("[TELEGRAM RECEIVED]", text);

  if (text === "/start")
    await sendMessage(chatId, "Francis online.");

  if (text === "/status")
    await sendMessage(chatId, "Authority status: ACTIVE");
}

async function poll() {
  try {
    const res = await fetch(
      `${API}/getUpdates?timeout=30&offset=${offset}`
    );

    const data = await res.json();

    if (!data.ok) {
      console.error("[TELEGRAM ERROR]", data);
      return;
    }

    for (const update of data.result) {
      offset = update.update_id + 1;
      await handle(update);
    }

  } catch (err) {
    console.error("[TELEGRAM POLL ERROR]", err);
  }

  setTimeout(poll, 1000);
}

console.log("[TELEGRAM] Bot online");

poll();
