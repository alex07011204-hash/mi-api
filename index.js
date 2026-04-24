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

    // 🔥 1. TRAER PARTIDOS REALES (CON TODOS LOS MERCADOS IMPORTANTES)
    const oddsRes = await fetch(
      `https://api.the-odds-api.com/v4/sports/soccer_spain_la_liga/odds/?apiKey=${process.env.ODDS_API_KEY}&regions=eu&markets=h2h,totals,spreads`
    );

    const oddsData = await oddsRes.json();

    // 🔥 2. COGER MÁS PARTIDOS PARA MEJOR SELECCIÓN
    const partidos = oddsData.slice(0, 8);

    // 🔥 3. FORMATEAR DATOS BIEN
    const infoPartidos = partidos.map(p => {
      const markets = p.bookmakers?.[0]?.markets?.map(m => {
        return `${m.key}: ${JSON.stringify(m.outcomes)}`;
      }).join(" | ");

      return `${p.home_team} vs ${p.away_team} -> ${markets}`;
    }).join("\n");

    // 🔥 4. IA NIVEL DIOS (VALUE BETS)
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `
Eres BetIA, tipster profesional experto en apuestas deportivas y VALUE BETS.

Dispones de estos partidos reales con cuotas:
${infoPartidos}

🎯 OBJETIVO:
Encontrar apuestas RENTABLES (no solo acertar, sino ganar dinero a largo plazo)

🧠 CÓMO PIENSAS:
1. Analizas cada partido
2. Estimas probabilidad real
3. Comparas con la cuota
4. SOLO eliges si hay VALUE

📊 FÓRMULA CLAVE:
Value = probabilidad estimada > (1 / cuota)

Si NO hay value → NO recomiendes

---

📌 MERCADOS QUE PUEDES USAR:
- ganador (h2h)
- over/under goles
- handicap (spreads)

---

⚠️ REGLAS IMPORTANTES:

- NO uses todos los partidos → selecciona los mejores
- EVITA apuestas malas aunque la cuota sea alta
- SI no hay valor → dilo claramente
- SI piden cuota alta → combinada inteligente (NO locura)
- NO inventes datos
- NO metas deportes sin datos

---

📋 FORMATO OBLIGATORIO:

📊 Análisis:
- Qué partidos has evaluado y por qué eliges esos

🎯 Picks con VALUE:
- Partido
- Tipo de apuesta
- Cuota
- Probabilidad estimada
- ¿Tiene value? (sí/no + breve explicación)

📈 Probabilidad total:
- XX%

💰 Cuota total:

🔥 Tipo:
- Simple o combinada

✅ Recomendación final:
- clara (apostar o no)

---

💡 IMPORTANTE:
- Cada pick debe aportar valor real
- Explica brevemente por qué suma a la apuesta
- Piensa como tipster profesional
- Prioriza rentabilidad, no cantidad
          `,
        },
        {
          role: "user",
          content: mensaje + " analiza en profundidad y busca apuestas con valor real",
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