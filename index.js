import express from "express";
import OpenAI from "openai";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();

// 🔥 CORS (esto arregla tu error)
app.use(cors());

// 🔥 Para leer JSON
app.use(express.json());

// 🔥 OpenAI config
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 🔥 Ruta del chat
app.post("/chat", async (req, res) => {
  try {
    const { mensaje } = req.body;

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "user", content: mensaje }
      ],
    });

    res.json({
      respuesta: response.choices[0].message.content
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

// 🔥 Servidor
app.listen(3000, () => {
  console.log("Servidor corriendo en http://localhost:3000");
});