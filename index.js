import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import fetch from "node-fetch";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 🔥 RUTA PRINCIPAL
app.post("/chat", async (req, res) => {
  try {
    const { mensaje } = req.body;

    // 🔥 1. TRAER PARTIDOS REALES
    const oddsRes = await fetch(
      `https://api.the-odds-api.com/v4/sports/soccer_spain_la_liga/odds/?apiKey=${process.env.ODDS_API_KEY}&regions=eu&markets=h2h`
    );

    const oddsData = await oddsRes.json();

    // 🔥 2. COGER 3 PARTIDOS
    const partidos = oddsData.slice(0, 3);

    const infoPartidos = partidos.map(p => {
      return `${p.home_team} vs ${p.away_team} | Cuotas: ${JSON.stringify(p.bookmakers[0].markets[0].outcomes)}`;
    }).join("\n");

    // 🔥 3. IA CON CONTEXTO REAL
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `
Eres BetIA, un experto en apuestas deportivas profesional.

Dispones de estos partidos reales con cuotas:
${infoPartidos}

Tu estilo:
- Claro, directo y como tipster PRO
- Nada de respuestas genéricas
- Solo apuestas útiles

Tu trabajo:
- Analizar partidos reales
- Detectar oportunidades
- Crear apuestas simples o combinadas

Formato SIEMPRE:

📊 Análisis:
(explicación clara basada en los partidos)

📈 Probabilidad:
(XX%)

💰 Cuota total:
(realista basada en las cuotas dadas)

✅ Recomendación:
(Apostar o no + motivo claro)

Reglas:
- NO inventes partidos
- USA los datos proporcionados
- Si no hay buena apuesta → dilo
- Prioriza combinadas si el usuario pide cuota alta
          `,
        },
        {
          role: "user",
          content: mensaje,
        },
      ],
    });

    const respuesta = completion.choices[0].message.content;

    res.json({ respuesta });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

// 🔥 SERVIDOR
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});