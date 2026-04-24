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
      `https://api.the-odds-api.com/v4/sports/soccer_spain_la_liga/odds/?apiKey=${process.env.ODDS_API_KEY}&regions=eu&markets=h2h,totals,spreads`
    );

    const oddsData = await oddsRes.json();

    if (!Array.isArray(oddsData)) {
      return res.json({ respuesta: "Error obteniendo datos de partidos" });
    }

    // 🔥 2. USAR MÁS PARTIDOS PARA MEJOR ANÁLISIS
    const partidos = oddsData.slice(0, 10);

    // 🔥 3. LIMPIAR Y FORMATEAR DATOS
    const infoPartidos = partidos.map(p => {
      if (!p.bookmakers || p.bookmakers.length === 0) return null;

      const markets = p.bookmakers[0].markets.map(m => {
        return `${m.key}: ${m.outcomes.map(o => `${o.name} (${o.price})`).join(", ")}`;
      }).join(" | ");

      return `${p.home_team} vs ${p.away_team} -> ${markets}`;
    }).filter(Boolean).join("\n");

    // 🔥 4. IA NIVEL DIOS (VALUE BETS + TIPSTER)
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: `
Eres BetIA, tipster profesional experto en apuestas deportivas y VALUE BETS.

Tienes estos partidos reales con cuotas:
${infoPartidos}

🎯 OBJETIVO:
Encontrar apuestas RENTABLES (value bets), no solo acertar.

🧠 CÓMO PIENSAS:
- Analizas cada partido
- Estimas probabilidad real
- Comparas con cuota
- SOLO eliges si hay VALUE

📊 FÓRMULA:
Value = probabilidad estimada > (1 / cuota)

Si no hay value → NO recomendar

---

📈 MERCADOS A USAR:
- ganador
- over/under goles
- handicap

---

⚠️ REGLAS PRO:

- NO uses todos los partidos
- SOLO selecciona los mejores
- EVITA apuestas sin valor
- SI no hay apuesta buena → dilo
- SI piden cuota alta → combinada INTELIGENTE
- NO inventes datos
- NO metas deportes sin datos

---

📊 FORMATO OBLIGATORIO:

📊 Análisis:
- Qué partidos has elegido y por qué tienen valor

🎯 Picks con VALUE:
- Partido
- Tipo apuesta
- Cuota
- Probabilidad estimada
- ¿Por qué tiene valor?

📈 Probabilidad total:
- XX%

💰 Cuota total:

🔥 Tipo:
- Simple o combinada

✅ Recomendación final:
- Apostar o no + motivo

---

💡 IMPORTANTE:
- Piensa como tipster profesional
- Prioriza rentabilidad a largo plazo
- Cada pick debe tener sentido real
          `,
        },
        {
          role: "user",
          content: mensaje + " analiza profundamente y busca apuestas con valor real",
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
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});