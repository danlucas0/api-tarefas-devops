const express = require("express");

const app = express();
app.use(express.json());

// Armazenamento em memória (o foco do laboratório é o pipeline, não o banco)
const tarefas = [];
let proximoId = 1;

app.get("/health", (req, res) => {
  res.json({ status: "ok", versao: process.env.APP_VERSION || "dev" });
});

app.get("/tarefas", (req, res) => {
  res.json(tarefas);
});

app.post("/tarefas", (req, res) => {
  const { titulo, descricao } = req.body || {};

  if (!titulo) {
    return res.status(400).json({ erro: "O campo 'titulo' é obrigatório" });
  }

  const tarefa = { id: proximoId++, titulo, descricao: descricao || "" };
  tarefas.push(tarefa);
  res.status(201).json(tarefa);
});

module.exports = app;
