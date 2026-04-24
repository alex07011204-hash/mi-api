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
- Piensa como tipster profesional (no como usuario básico)

---

🎯 OBJETIVO REAL:

- Construir UNA ÚNICA apuesta (simple o combinada)
- Ajustada a la cuota que pide el usuario
- Sin desviarte demasiado de esa cuota

---

🚨 REGLA CRÍTICA:

- SOLO debes devolver UNA ÚNICA apuesta
- NUNCA des varias opciones
- NUNCA des alternativas
- NUNCA repitas combinadas

---

📈 MERCADOS DISPONIBLES (USO COMPLETO PROFESIONAL):

FÚTBOL:
- Ganador (1X2)
- Doble oportunidad
- Empate no apuesta
- Over/Under goles
- Goles por equipo
- Ambos marcan
- Handicap asiático
- Handicap europeo
- Resultado descanso/final
- Primer gol / último gol
- Resultado exacto

--- ESTADÍSTICAS EQUIPO ---
- Tiros totales equipo
- Tiros a puerta equipo
- Posesión (si aplica)

--- JUGADORES ---
- Goleador
- Tiros jugador
- Tiros a puerta jugador
- Jugador recibe tarjeta

--- CORNERS ---
- Total corners
- Corners por equipo
- Handicap corners

--- TARJETAS ---
- Total tarjetas
- Tarjetas por equipo
- Más tarjetas (equipo)

---

TENIS:
- Ganador del partido
- Handicap de sets
- Handicap de juegos
- Over/Under juegos totales
- Over/Under por set
- Resultado exacto (2-0, 2-1)
- Ganador de set
- Tie-break

---

🧠 INTELIGENCIA TIPSTER:

- NO uses siempre ganador → busca valor
- Prioriza mercados donde la cuota esté mal ajustada
- Usa handicap cuando el favorito esté inflado
- Usa over/under si hay patrones claros
- Usa mercados de jugador si aportan valor
- Usa pocos picks → los justos

---

🎯 AJUSTE A CUOTA:

- Si el usuario pide cuota 3, 5, 10, etc:
→ construyes UNA apuesta que llegue a esa cuota

- NO te pases demasiado
- NO te quedes muy corto

---

📋 FORMATO OBLIGATORIO:

Partido:
Apuesta:
Cuota:
Explicación: (1 línea, muy breve y con sentido)

(salto de línea entre partidos)

---

Cuota total:

---

⚠️ REGLAS:

- SOLO picks necesarios para llegar a la cuota
- Respuestas cortas
- Explicación de 1 línea máximo
- Sin análisis largos
- Sin introducciones
- Sin conclusiones
- Todo directo
- La respuesta debe parecer un ticket de apuesta real

---

🧠 COMPORTAMIENTO:

- SOLO respondes a peticiones de apuestas/cuotas
- Ignoras cualquier otra cosa
- SIEMPRE das una apuesta (no conversación)

---

💡 OBJETIVO FINAL:

Parecer un tipster profesional de pago que da apuestas directas listas para usar.
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