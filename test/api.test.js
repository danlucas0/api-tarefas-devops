// Testes de API: cada teste corresponde a um caso do PLANO_DE_TESTES.md (CT-xx)
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

function postTarefa(corpo, contentType = "application/json") {
  return fetch(`${url}/tarefas`, {
    method: "POST",
    headers: { "Content-Type": contentType },
    body: typeof corpo === "string" ? corpo : JSON.stringify(corpo),
  });
}

test("CT-01: GET /health retorna 200 e status ok", async () => {
  const res = await fetch(`${url}/health`);
  assert.strictEqual(res.status, 200);
  assert.match(res.headers.get("content-type"), /application\/json/);
  const body = await res.json();
  assert.strictEqual(body.status, "ok");
  assert.ok(body.versao, "deve informar a versão");
});

test("CT-02: POST /tarefas com dados válidos cadastra a tarefa (201)", async () => {
  const res = await postTarefa({ titulo: "Estudar DevOps", descricao: "Pipeline CI/CD" });
  assert.strictEqual(res.status, 201);
  const body = await res.json();
  assert.ok(Number.isInteger(body.id));
  assert.strictEqual(body.titulo, "Estudar DevOps");
  assert.strictEqual(body.descricao, "Pipeline CI/CD");
});

test("CT-03: POST /tarefas sem descrição cadastra com descrição vazia", async () => {
  const res = await postTarefa({ titulo: "Só o título" });
  assert.strictEqual(res.status, 201);
  const body = await res.json();
  assert.strictEqual(body.descricao, "");
});

test("CT-04: POST /tarefas sem título retorna 400 com mensagem de erro", async () => {
  const res = await postTarefa({ descricao: "sem título" });
  assert.strictEqual(res.status, 400);
  const body = await res.json();
  assert.match(body.erro, /titulo/);
});

test("CT-05: POST /tarefas com corpo vazio retorna 400", async () => {
  const res = await postTarefa({});
  assert.strictEqual(res.status, 400);
});

test("CT-06: POST /tarefas com JSON malformado retorna 400", async () => {
  const res = await postTarefa("{ titulo: sem aspas ");
  assert.strictEqual(res.status, 400);
  const body = await res.json();
  assert.strictEqual(body.erro, "JSON inválido");
  assert.ok(!JSON.stringify(body).includes("at "), "não pode expor stack trace");
});

test("CT-07: GET /tarefas lista as tarefas cadastradas", async () => {
  await postTarefa({ titulo: "Tarefa para listar" });
  const res = await fetch(`${url}/tarefas`);
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.ok(Array.isArray(body));
  assert.ok(body.some((t) => t.titulo === "Tarefa para listar"));
});

test("CT-08: IDs são únicos e sequenciais", async () => {
  const a = await (await postTarefa({ titulo: "A" })).json();
  const b = await (await postTarefa({ titulo: "B" })).json();
  assert.strictEqual(b.id, a.id + 1);
  const lista = await (await fetch(`${url}/tarefas`)).json();
  const ids = lista.map((t) => t.id);
  assert.strictEqual(new Set(ids).size, ids.length);
});

test("CT-09: rota inexistente retorna 404", async () => {
  const res = await fetch(`${url}/rota-que-nao-existe`);
  assert.strictEqual(res.status, 404);
  const body = await res.json();
  assert.strictEqual(body.erro, "Rota não encontrada");
});
