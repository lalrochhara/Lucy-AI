import axios from "axios";

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const GEMINI_KEY = process.env.GEMINI_KEY;

export default async function handler(req, res) {

  if (!req.body?.message?.text) {
    return res.status(200).send("ok");
  }

  const chat_id = req.body.message.chat.id;
  const userText = req.body.message.text.trim();

  let reply = "";

  try {

    // SEARCH MEMORY
    const search = await axios.get(
      `${SUPABASE_URL}/rest/v1/memory?question=eq.${encodeURIComponent(userText)}`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`
        }
      }
    );

    if (search.data && search.data.length > 0) {

      reply = search.data[0].answer;

    } else {

      // ASK GEMINI AI
      const ai = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
        {
          contents: [{
            parts: [{
              text: `Mizo tawng chauh hmanga chhang rawh: ${userText}`
            }]
          }]
        }
      );

      reply = ai.data.candidates[0].content.parts[0].text;

      // SAVE MEMORY
      await axios.post(
        `${SUPABASE_URL}/rest/v1/memory`,
        {
          question: userText,
          answer: reply
        },
        {
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal"
          }
        }
      );

    }

  } catch (error) {

    console.log("ERROR:", error.response?.data || error.message);

    reply = "Ka chhang thei lo. Eng emaw buaina a awm.";

  }

  // SEND MESSAGE TO TELEGRAM
  await axios.post(
    `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
    {
      chat_id: chat_id,
      text: reply
    }
  );

  res.status(200).send("ok");

}
