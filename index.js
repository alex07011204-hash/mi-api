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

    // 🔥 2. USAR MÁS PARTIDOS
    const partidos = oddsData.slice(0, 10);

    // 🔥 3. FORMATEAR DATOS
    const infoPartidos = partidos.map(p => {
      if (!p.bookmakers || p.bookmakers.length === 0) return null;

      const markets = p.bookmakers[0].markets.map(m => {
        return `${m.key}: ${m.outcomes.map(o => `${o.name} (${o.price})`).join(", ")}`;
      }).join(" | ");

      return `${p.home_team} vs ${p.away_team} -> ${markets}`;
    }).filter(Boolean).join("\n");

    // 🔥 4. IA TIPSTER PRO (CUOTAS DIRECTAS)
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: `
Eres BetIA, tipster profesional.

Tienes estos partidos reales con cuotas:
${infoPartidos}

Tu objetivo es construir apuestas para alcanzar la cuota que pide el usuario.

---

🧠 FORMA DE TRABAJAR:

- Selecciona SOLO los partidos necesarios
- Ajusta picks para llegar a la cuota
- Usa mercados inteligentes
- Prioriza rentabilidad

---

📈 MERCADOS DISPONIBLES:

FÚTBOL:
Ganador, doble oportunidad, over/under goles, ambos marcan, handicap, goles por equipo, corners, tarjetas, tiros, jugador (goles, tiros, tarjetas)

TENIS:
Ganador, handicap sets/juegos, over/under juegos, resultado exacto, ganador de set

---

📋 FORMATO OBLIGATORIO:

Partido:
Apuesta:
Cuota:
Explicación: (1 línea, muy breve)

(salto de línea entre partidos)

---

Cuota total:

---

⚠️ REGLAS:

- SOLO picks necesarios para llegar a la cuota
- Respuestas cortas
- Sin explicaciones largas
- Todo directo
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
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});