const { test, before, after } = require("node:test");
const assert = require("node:assert");
const app = require("../src/app");

let server;
let url;

before(() => {
  server = app.listen(0);
  url = `http://localhost:${server.address().port}`;
});

after(() => server.close());

test("GET /health retorna status ok", async () => {
  const res = await fetch(`${url}/health`);
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.strictEqual(body.status, "ok");
});

test("POST /tarefas cadastra uma tarefa", async () => {
  const res = await fetch(`${url}/tarefas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ titulo: "Estudar DevOps", descricao: "Pipeline CI/CD" }),
  });
  assert.strictEqual(res.status, 201);
  const body = await res.json();
  assert.strictEqual(body.titulo, "Estudar DevOps");
});

test("POST /tarefas sem título retorna 400", async () => {
  const res = await fetch(`${url}/tarefas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  assert.strictEqual(res.status, 400);
});

test("GET /tarefas lista as tarefas cadastradas", async () => {
  const res = await fetch(`${url}/tarefas`);
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.ok(body.length >= 1);
});
