# Plano de Testes: API de Tarefas

| | |
|---|---|
| **Projeto** | API de Tarefas com pipeline CI/CD e DevSecOps |
| **Repositório** | https://github.com/danlucas0/api-tarefas-devops |
| **Aluno** | Daniel Lucas Andrade de Souza |
| **Versão do plano** | 1.0 (23/11/2026) |

## 1. Objetivo

Garantir que cada versão da API de Tarefas só chegue à produção se estiver **funcionando corretamente**, **empacotada de forma executável** e **sem vulnerabilidades graves**. Para isso, os testes são **automatizados e executados pelo pipeline (GitHub Actions) a cada alteração do código**. Uma falha em qualquer etapa bloqueia a publicação.

## 2. Escopo

**Dentro do escopo**

- Endpoints da API: `GET /health`, `GET /tarefas`, `POST /tarefas`
- Tratamento de erros (dados inválidos, JSON malformado, rota inexistente)
- Imagem Docker: inicialização, funcionamento e execução sem privilégios
- Segurança: dependências, segredos, código-fonte e imagem
- Pipeline de CI/CD: bloqueio em caso de falha, publicação no GHCR e deploy

**Fora do escopo** (nesta versão)

- Testes de carga/desempenho
- Persistência em banco de dados (a API usa armazenamento em memória)
- Interface gráfica (o projeto é só uma API)

## 3. Estratégia de testes

Os testes seguem a **pirâmide de testes**: muitos testes rápidos e baratos na base, e menos testes mais caros no topo. Todos rodam automaticamente no pipeline.

```
                 ┌───────────────────────┐
                 │  Deploy / produção    │  CT-18     (VPS)
                 ├───────────────────────┤
                 │  Pipeline (CI/CD)     │  CT-16, 17
                 ├───────────────────────┤
                 │  Smoke do container   │  CT-10, 11
                 ├───────────────────────┤
                 │  Segurança            │  CT-12 a 15
                 ├───────────────────────┤
                 │  Testes de API        │  CT-01 a 09
                 └───────────────────────┘
```

| Tipo de teste | O que verifica | Ferramenta | Quando roda |
|---|---|---|---|
| **API / integração** | Comportamento de cada endpoint, incluindo cenários de erro | `node:test` + `fetch` | Todo push e Pull Request |
| **Cobertura de código** | Percentual do código exercitado pelos testes (mínimo 90% das linhas) | `node --experimental-test-coverage` | Todo push e Pull Request |
| **Smoke test** | A imagem Docker sobe e responde | Docker + `curl` | Todo push e Pull Request |
| **SCA (dependências)** | Bibliotecas com vulnerabilidades conhecidas | `npm audit` | Todo push, PR e semanalmente |
| **Segredos** | Senhas, tokens e chaves no código e no histórico | Gitleaks | Todo push, PR e semanalmente |
| **SAST** | Falhas de segurança no código-fonte | CodeQL | Todo push, PR e semanalmente |
| **Scan de imagem** | Vulnerabilidades no sistema e nos pacotes da imagem | Grype | Todo push, PR e semanalmente |
| **Regressão** | Todos os testes acima são reexecutados a cada alteração | GitHub Actions | Automático |

## 4. Ambiente e ferramentas

| Item | Detalhe |
|---|---|
| Linguagem / framework | Node.js 24 + Express 5 |
| Execução dos testes | GitHub Actions (`ubuntu-latest`) e localmente com `npm test` |
| Container | Docker, imagem `node:24-alpine` |
| Registro de imagens | GitHub Container Registry (GHCR) |
| Produção | VPS Linux com Nginx (reverse proxy) |

## 5. Critérios

**Critérios de entrada** (para iniciar os testes)

- Código enviado ao GitHub (push na `main` ou Pull Request)
- Dependências instaláveis com `npm ci`

**Critérios de saída / aceite** (para a versão ir para produção)

- 100% dos casos de teste de API aprovados
- Cobertura de linhas **≥ 90%**
- Smoke test do container aprovado
- Nenhuma dependência com vulnerabilidade **alta ou crítica**
- Nenhum segredo encontrado
- Nenhum alerta de segurança do CodeQL
- Nenhuma vulnerabilidade **crítica com correção disponível** na imagem

**Critério de bloqueio:** se qualquer critério acima falhar, o pipeline para e **a imagem não é publicada nem implantada**.

## 6. Casos de teste

| ID | Tipo | Descrição | Entrada / ação | Resultado esperado | Automação |
|---|---|---|---|---|---|
| CT-01 | API | Verificar saúde da aplicação | `GET /health` | `200`, JSON com `status: "ok"` e versão | `test/api.test.js` |
| CT-02 | API | Cadastrar tarefa válida | `POST /tarefas` com `titulo` e `descricao` | `201`, tarefa com `id` numérico, título e descrição | `test/api.test.js` |
| CT-03 | API | Cadastrar tarefa sem descrição | `POST /tarefas` só com `titulo` | `201`, `descricao` vazia | `test/api.test.js` |
| CT-04 | API | Rejeitar tarefa sem título | `POST /tarefas` sem `titulo` | `400`, mensagem de erro citando `titulo` | `test/api.test.js` |
| CT-05 | API | Rejeitar corpo vazio | `POST /tarefas` com `{}` | `400` | `test/api.test.js` |
| CT-06 | API / segurança | Rejeitar JSON malformado sem expor detalhes internos | `POST /tarefas` com JSON inválido | `400`, `{"erro": "JSON inválido"}`, **sem stack trace** | `test/api.test.js` |
| CT-07 | API | Listar tarefas cadastradas | Cadastrar uma tarefa, depois `GET /tarefas` | `200`, lista contendo a tarefa | `test/api.test.js` |
| CT-08 | API | IDs únicos e sequenciais | Cadastrar duas tarefas seguidas | IDs consecutivos, sem repetição na lista | `test/api.test.js` |
| CT-09 | API | Rota inexistente | `GET /rota-que-nao-existe` | `404`, JSON de erro | `test/api.test.js` |
| CT-10 | Smoke | Container sobe e a API responde | `docker run` da imagem; `GET /health`, `POST` e `GET /tarefas` | Respostas corretas dentro do container | Pipeline: *Smoke test do container* |
| CT-11 | Smoke / segurança | Container roda sem privilégios de root | `docker exec smoke whoami` | Usuário `node` | Pipeline: *Smoke test do container* |
| CT-12 | Segurança (SCA) | Dependências sem vulnerabilidades graves | `npm audit --audit-level=high` | Nenhuma vulnerabilidade alta/crítica | Pipeline: *Scan: dependências* |
| CT-13 | Segurança | Nenhum segredo no repositório | Gitleaks em todo o histórico | Nenhum vazamento encontrado | Pipeline: *Scan: segredos* |
| CT-14 | Segurança (SAST) | Código sem falhas de segurança | CodeQL (`security-extended`) | Nenhum alerta | Pipeline: *Scan: código-fonte* |
| CT-15 | Segurança | Imagem sem vulnerabilidade crítica corrigível | Grype na imagem construída | Nenhuma crítica com correção disponível | Pipeline: *Scan: imagem Docker* |
| CT-16 | Pipeline | Falha bloqueia a publicação | Enviar versão com problema (teste ou scan falhando) | Pipeline interrompido, imagem **não** publicada | Dependência entre jobs (`needs`) |
| CT-17 | Pipeline | Versão aprovada é publicada | Push na `main` com tudo aprovado | Imagem no GHCR com tags `latest` e `sha-<commit>` | Pipeline: *Publicar imagem* |
| CT-18 | Deploy | Nova versão chega à produção | Pipeline aprovado + secrets da VPS | Container atualizado na VPS e `/health` respondendo | Pipeline: *Deploy na VPS* |

## 7. Resultados da execução

**Data:** 23/11/2026. **Execução:** [GitHub Actions #45290634423](https://github.com/danlucas0/api-tarefas-devops/actions/runs/45290634423)

| ID | Status | Observação |
|---|---|---|
| CT-01 a CT-09 | ✅ Aprovado | 9/9 testes aprovados. Cobertura: **95,45% das linhas**, 100% das funções |
| CT-10 | ✅ Aprovado | Container subiu, `/health` respondeu `{"status":"ok"}`, cadastro e listagem funcionaram |
| CT-11 | ✅ Aprovado | Container executa como usuário `node` |
| CT-12 | ✅ Aprovado | `found 0 vulnerabilities` |
| CT-13 | ✅ Aprovado | Nenhum segredo encontrado |
| CT-14 | ✅ Aprovado | Nenhum alerta |
| CT-15 | ✅ Aprovado | `No vulnerabilities found` (após correção do DEF-01) |
| CT-16 | ✅ Aprovado | Comprovado na [execução #45287271007](https://github.com/danlucas0/api-tarefas-devops/actions/runs/45287271007): o scan da imagem falhou e a publicação **não** aconteceu |
| CT-17 | ✅ Aprovado | Imagem publicada em `ghcr.io/danlucas0/api-tarefas-devops` |
| CT-18 | ⏸️ Não executado | Bloqueado: VPS ainda não disponível. O job está pronto e é ativado ao cadastrar os secrets `VPS_HOST`, `VPS_USER` e `VPS_SSH_KEY` |

**Resumo:** 17 de 18 casos aprovados, 1 não executado por falta de ambiente, 0 reprovados.

## 8. Defeitos encontrados

| ID | Encontrado por | Severidade | Descrição | Correção | Status |
|---|---|---|---|---|---|
| DEF-01 | CT-15 (Grype) | Crítica | `zlib` da imagem base com a CVE-2026-4738, além de falhas altas no OpenSSL | `apk upgrade --no-cache` no `Dockerfile` | ✅ Corrigido |
| DEF-02 | CT-15 (Grype) | Alta | npm embutido na imagem com vulnerabilidades (`undici`, `brace-expansion`) | npm/yarn removidos da imagem final; a API inicia com `node` | ✅ Corrigido |
| DEF-03 | CT-06 | Média | JSON malformado retornava página HTML com **stack trace** (vazamento de informação interna) | Tratamento de erros em JSON sem detalhes internos + `NODE_ENV=production` | ✅ Corrigido |

## 9. Riscos e limitações

| Risco | Impacto | Mitigação |
|---|---|---|
| Armazenamento em memória | Tarefas são perdidas ao reiniciar o container | Fora do escopo; próxima etapa: banco de dados com testes de integração |
| VPS indisponível | CT-18 não pode ser executado | Job de deploy pronto e condicionado aos secrets |
| Novas vulnerabilidades descobertas após o deploy | Versão em produção pode ficar vulnerável | Scan agendado semanal + Dependabot |
| Sem teste de carga | Desempenho sob muitos acessos desconhecido | Avaliar ferramenta de carga (ex.: k6) em versão futura |

## 10. Como executar

```bash
npm ci
npm test                 # casos CT-01 a CT-09
npm run test:coverage    # mesmos testes + relatório de cobertura (mínimo 90%)
```

No GitHub, todos os casos rodam automaticamente a cada push. O resumo de cada execução (testes, cobertura, smoke test e scans) aparece em **Actions → execução → Summary**.
