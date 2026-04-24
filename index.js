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

    // 🔥 4. IA FINAL PRO
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

🎯 OBJETIVO:

- Crear UNA ÚNICA apuesta (simple o combinada)
- Ajustada a la cuota pedida

---

🎯 SELECCIÓN INTELIGENTE:

- NO hagas una apuesta por cada partido
- NO uses todos los partidos disponibles
- Selecciona SOLO los mejores partidos posibles
- Construye UNA ÚNICA combinada con los picks más fuertes

- Si el usuario pide cuota (ej: 3, 6, 200):
  → NO generes varias opciones
  → NO hagas múltiples combinadas
  → SOLO crea la MEJOR apuesta posible para esa cuota

- Prioriza calidad sobre cantidad
- Menos picks, mejor elegidos

---

🚨 REGLAS CRÍTICAS:

- SOLO UNA apuesta
- PROHIBIDO múltiples combinadas
- PROHIBIDO mostrar cálculos
- PROHIBIDO hacer pruebas en texto

---

🧠 CONTROL ANTI-FALLOS:

- Calcula la cuota UNA sola vez internamente
- NO recalcules
- NO ajustes en el mensaje
- NO cambies picks varias veces
- Devuelve SOLO resultado final

- Si cuota alta (+100):
  → usa 3-5 picks
  → cuotas entre 2.0 y 4.0
  → evita cuotas bajas

- MIN 2 picks
- MAX 6 picks

---

📈 MERCADOS DISPONIBLES:

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
- Primer/último gol
- Resultado exacto
- Tiros equipo
- Tiros a puerta
- Posesión
- Goleador
- Tiros jugador
- Tarjeta jugador
- Corners
- Tarjetas

TENIS:
- Ganador
- Handicap sets
- Handicap juegos
- Over/Under juegos
- Resultado exacto
- Ganador de set
- Tie-break

BALONCESTO:
- Ganador
- Handicap puntos
- Over/Under puntos
- Puntos equipo
- Puntos jugador
- Rebotes
- Asistencias
- Triples

---

📋 FORMATO OBLIGATORIO:

Partido:
Apuesta:
Cuota:

(salto de línea entre picks)

---

🧾 Explicación general:
(1-2 líneas máximo)

---

Cuota total:

---

⚠️ REGLAS:

- Respuesta corta
- Sin texto extra
- Formato tipo ticket

---

🧠 COMPORTAMIENTO:

- SOLO responder a apuestas/cuotas
- SIEMPRE devolver 1 apuesta limpia

---

💡 OBJETIVO:

Parecer tipster profesional real
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