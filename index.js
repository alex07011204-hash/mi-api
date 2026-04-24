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

    // 🔥 1. TRAER PARTIDOS REALES (CON MÁS MERCADOS)
    const oddsRes = await fetch(
      `https://api.the-odds-api.com/v4/sports/soccer_spain_la_liga/odds/?apiKey=${process.env.ODDS_API_KEY}&regions=eu&markets=h2h,totals,spreads`
    );

    const oddsData = await oddsRes.json();

    // 🔥 2. FILTRAR PARTIDOS (solo algunos, no todos)
    const partidos = oddsData.slice(0, 6);

    // 🔥 3. FORMATEAR DATOS BIEN (TODOS LOS MERCADOS)
    const infoPartidos = partidos.map(p => {
      const markets = p.bookmakers?.[0]?.markets?.map(m => {
        return `${m.key}: ${JSON.stringify(m.outcomes)}`;
      }).join(" | ");

      return `${p.home_team} vs ${p.away_team} -> ${markets}`;
    }).join("\n");

    // 🔥 4. IA NIVEL TIPSTER PRO
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `
Eres BetIA, tipster profesional de apuestas deportivas.

Tienes estos partidos reales con cuotas:
${infoPartidos}

OBJETIVO:
- Encontrar apuestas RENTABLES (value)
- NO elegir todos los partidos
- Elegir SOLO los mejores

PIENSA COMO TIPSTER:
- Analiza cada partido
- Detecta dónde hay valor (cuota vs probabilidad)
- Evita picks malos aunque la cuota sea alta

USA MERCADOS AVANZADOS:
- ganador (h2h)
- over/under goles
- handicap (spreads)

REGLAS IMPORTANTES:

- NO uses todos los partidos → selecciona los mejores
- SI un partido no tiene valor → ignóralo
- SI no hay buena apuesta → dilo
- SI piden cuota alta → crea combinada inteligente
- NO metas deportes sin datos
- NO inventes nada

FORMATO:

📊 Análisis:
- Explica brevemente qué partidos has elegido y por qué

🎯 Picks:
- Partido 1: (tipo de apuesta + breve motivo)
- Partido 2: (si hay)
- Partido 3: (si hay)

📈 Probabilidad total:
- XX%

💰 Cuota total:
- basada en datos reales

🔥 Tipo:
- Simple o combinada

✅ Recomendación final:
- clara, directa y profesional

IMPORTANTE:
- Cada pick debe tener sentido
- Explica brevemente por qué aporta valor a la cuota
- Piensa en rentabilidad, no en acertar por acertar
          `,
        },
        {
          role: "user",
          content: mensaje + " (usa solo datos reales, no inventes nada)",
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