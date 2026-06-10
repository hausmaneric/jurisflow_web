# JurisFlow Web

Aplicacao web Angular do JurisFlow, preparada para uso profissional com a API JurisFlow no Railway.

## Stack

- Angular 21
- Syncfusion
- SCSS
- Nginx para deploy estatico com fallback SPA

## API

URL configurada em `src/app/resources.ts`:

```ts
export const apiURL = 'https://web-production-3c57a.up.railway.app/api/v1/';
```

## Modulos

- Login e recuperacao de senha
- Cadastro publico de escritorio com login automatico
- Dashboard executivo
- Clientes e funil de leads
- Processos
- Agenda unificada com compromissos, prazos e tarefas
- Documentos, OCR, versoes, anexos e assinaturas
- Comunicacoes e modelos
- Financeiro
- Relatorios e BI juridico
- Usuarios, perfis e permissoes
- Configuracoes do escritorio
- Portal publico do cliente
- Captacao publica de leads
- Assinatura publica de documentos

## Desenvolvimento local

```bash
npm install
npm start
```

## Build

```bash
npm run build
```

Saida de build:

```text
dist/obrax-empresarial/browser
```

O nome interno do projeto Angular ainda referencia a base estrutural original, mas a aplicacao, marca e rotas sao do JurisFlow.

## Deploy no Railway

O projeto inclui:

- `Dockerfile` multi-stage para build Angular
- `nginx.conf.template` com `try_files $uri $uri/ /index.html`
- suporte ao `PORT` do Railway via `envsubst`

Fluxo recomendado:

1. Publique a pasta `web` em um repositorio Git.
2. No Railway, crie um novo servico a partir desse repositorio.
3. Use o Dockerfile do projeto.
4. Gere o dominio em `Settings -> Networking`.
5. Confirme que a API aceita CORS para o dominio do web.

## Rotas publicas importantes

- `/cadastro`
- `/escritorio/:companyCode/contato`
- `/escritorio/:companyCode/portal`
- `/assinatura/:token`
