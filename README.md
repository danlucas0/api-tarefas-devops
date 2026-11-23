# API de Tarefas: Pipeline CI/CD

**Aluno:** Daniel Lucas Andrade de Souza

API simples em **Node.js + Express** usada para praticar um pipeline de **CI/CD com GitHub Actions**. A cada `git push` na branch `main`, o pipeline testa o código, constrói a imagem Docker, publica no **GitHub Container Registry (GHCR)** e atualiza a aplicação na VPS.

## Fluxo

![Fluxo CI/CD](docs/fluxo-cicd.png)

```
Git Push → GitHub Actions → Docker Build → GHCR → VPS → Nginx → API
```

## Endpoints

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/health` | Verifica se a aplicação está funcionando |
| `GET` | `/tarefas` | Lista as tarefas cadastradas |
| `POST` | `/tarefas` | Cadastra uma tarefa (`{ "titulo": "...", "descricao": "..." }`) |

## Pipeline (`.github/workflows/ci-cd.yml`)

| Job | O que faz |
|---|---|
| **1. Validação e testes + scans de segurança** | Instala as dependências (`npm ci`) e roda os testes automatizados (`npm test`) |
| **2. Docker Build e push no GHCR** | Constrói a imagem com o `Dockerfile` e publica em `ghcr.io/danlucas0/api-tarefas-devops` (tags `latest` e o hash do commit) |
| **3. Deploy na VPS** | Acessa a VPS por SSH, baixa a nova imagem, recria o container e testa o `/health` |

Os jobs dependem um do outro: se os testes falharem, nada é publicado.

## DevSecOps: scans automáticos de segurança

A segurança faz parte do pipeline (*shift left*): toda alteração passa por 4 scans automáticos **antes** de virar imagem publicada. Se algum scan encontrar problema grave, o pipeline para e nada vai para produção.

```
git push ──┬── Testes ─────────────────────┐
           ├── Scan de dependências (SCA) ─┤
           ├── Scan de segredos ───────────┼──→ Build da imagem → Scan da imagem → Push GHCR → Deploy
           └── Scan de código (SAST) ──────┘
```

| Scan | Ferramenta | O que procura | Bloqueia quando |
|---|---|---|---|
| **Dependências (SCA)** | `npm audit` | Bibliotecas do `package.json` com vulnerabilidades conhecidas (CVEs) | Vulnerabilidade **alta** ou **crítica** |
| **Segredos** | Gitleaks | Senhas, tokens e chaves esquecidos no código e em **todo o histórico** do Git | Qualquer segredo encontrado |
| **Código-fonte (SAST)** | CodeQL | Falhas no próprio código (injeção, XSS, path traversal…) | Alerta de segurança |
| **Imagem Docker** | Grype | Vulnerabilidades no sistema operacional e nos pacotes da imagem | Falha **crítica** que já tenha correção |

Outras medidas:

- **Aba Security do GitHub:** resultados do CodeQL e do Grype são enviados no formato SARIF e ficam em *Security → Code scanning*.
- **Resumo na execução:** o relatório do `npm audit` e do Grype aparece no resumo de cada execução em *Actions*.
- **Scan agendado:** o pipeline também roda **toda segunda-feira**, porque novas vulnerabilidades são descobertas mesmo sem o código mudar.
- **Dependabot** (`.github/dependabot.yml`): verifica toda semana dependências npm, imagem base do Docker e versões das actions, e abre Pull Requests de atualização.
- **Cadeia de suprimentos:** actions de terceiros (Gitleaks e Grype) fixadas pelo **hash do commit**, e não pela tag, para evitar que uma tag adulterada injete código no pipeline.
- **Imagem enxuta:** a imagem roda com usuário sem privilégios (`USER node`) e só com as dependências de produção (`npm ci --omit=dev`).

### O scan na prática: vulnerabilidade encontrada e corrigida

Na primeira execução com os scans, o **Grype bloqueou o pipeline**: a imagem base `node:24-alpine` tinha uma vulnerabilidade **crítica** no `zlib` (CVE-2026-4738), além de falhas altas no OpenSSL (`libssl3`/`libcrypto3`) e em pacotes do npm que vem embutido na imagem (`undici`, `brace-expansion`). A imagem vulnerável **não foi publicada**.

Correções aplicadas no `Dockerfile`:

1. `apk upgrade --no-cache`: atualiza os pacotes do sistema da imagem (corrigiu `zlib` e OpenSSL).
2. Remoção do npm/yarn da imagem final: eles só são usados no build. A API passou a iniciar direto com `node src/server.js`.

Resultado depois da correção: **"No vulnerabilities found"** (nenhuma vulnerabilidade com correção disponível) e o pipeline seguiu até a publicação.

| Execução | Resultado |
|---|---|
| Antes da correção | ❌ Bloqueado no scan da imagem (1 crítica + várias altas) |
| Depois da correção | ✅ Todos os scans aprovados, imagem publicada no GHCR |

O Dependabot também abriu sozinho um Pull Request propondo a imagem `node:26-alpine`, e esse PR passou pelos mesmos scans antes de poder ser aceito.

## Deploy

O deploy só roda quando os secrets da VPS estão cadastrados em *Settings → Secrets and variables → Actions*:

| Secret | Conteúdo |
|---|---|
| `VPS_HOST` | IP da VPS |
| `VPS_USER` | Usuário SSH |
| `VPS_SSH_KEY` | Chave SSH privada |

## Rodando localmente

```bash
npm install
npm test        # roda os testes
npm start       # sobe a API em http://localhost:3000
```

Com Docker:

```bash
docker build -t api-tarefas .
docker run -p 3000:3000 api-tarefas
```

Usando a imagem publicada pelo pipeline:

```bash
docker run -p 3000:3000 ghcr.io/danlucas0/api-tarefas-devops:latest
```

## Conceitos aplicados

- **CI (Integração Contínua):** todo push é testado automaticamente.
- **CD (Entrega Contínua):** a versão aprovada é empacotada e levada à produção sem deploy manual.
- **Containers:** a aplicação roda igual em qualquer máquina com Docker.
- **Registry (GHCR):** a imagem fica versionada e disponível para o servidor baixar.
