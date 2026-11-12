# Ponto

Sistema de gerenciamento de grades horárias e geração de folhas de ponto de professores — Fatec Zona Leste.

## Funcionalidades

- Importação de grades em PDF e DOCX (até 10 MB), com gravação dos dados de professores, componentes curriculares e aulas.
- Consulta de grades com busca textual e filtros por semestre, curso, período, status e vigência.
- Edição de dados cadastrais e de carga horária.
- Geração de folhas mensais em DOCX e, opcionalmente, PDF.

O importador PDF depende do layout institucional atualmente suportado. Horas de atividade e HAE são informadas/editadas manualmente; não são extraídas pela importação. A tela de pesquisa de satisfação ainda não persiste respostas.

## Tecnologias

- PHP 8.3+ e Laravel 13
- Inertia.js 3 e React 19
- Vite 8
- Banco de dados configurado pelo Laravel (SQLite no `.env.example`; MySQL pode ser configurado para a implantação)

## Requisitos operacionais

- Composer, Node.js e npm.
- Poppler (`pdftotext` e `pdftohtml`) instalado e disponível no `PATH` do servidor para importar PDFs.
- O modelo DOCX em `storage/app/private/templates/folha_ponto_modelo.docx`. O modelo institucional não é distribuído neste repositório; obtenha e instale a versão aprovada antes de gerar folhas.
- LibreOffice (`soffice`) instalado e disponível no `PATH` do servidor para gerar PDF. A geração DOCX não depende do LibreOffice.
- Diretórios de `storage` graváveis e persistentes, com backup operacional. Os uploads e os documentos gerados usam o disco privado padrão, não a pasta pública.

## Instalação e execução

1. Instale as dependências PHP e JavaScript:

   ```sh
   composer install
   npm ci
   ```

2. Crie o `.env` a partir do `.env.example`, gere a chave e configure o banco:

   ```sh
   cp .env.example .env
   php artisan key:generate
   ```

   Em produção, configure `APP_ENV=production`, `APP_DEBUG=false`, uma `APP_URL` HTTPS e credenciais próprias para o banco. Não use credenciais reais no Git.

3. Execute as migrações e gere os assets:

   ```sh
   php artisan migrate --force
   npm run build
   ```

4. Instale o modelo aprovado em `storage/app/private/templates/folha_ponto_modelo.docx` e verifique permissões, persistência e backup de `storage/app/private`.

## Testes

```sh
php artisan test
npm run build
```

O teste do parser PDF usa arquivos sintéticos e requer `pdftotext` e `pdftohtml` do Poppler disponíveis no `PATH`.

## Acesso e implantação

O sistema não possui autenticação nas rotas da aplicação e armazena dados pessoais de professores, incluindo CPF e documentos de folha de ponto. **Não o exponha à internet pública.** Antes de implantar, defina e aplique uma barreira de acesso na infraestrutura (por exemplo, VPN institucional, rede institucional ou allowlist em proxy/firewall). Essa decisão ainda está pendente; portanto, a exposição da aplicação permanece bloqueada.

O `composer audit` também reporta advisories em dependências instaladas. Revise e resolva esses apontamentos antes de uma implantação; atualizações de dependências exigem validação própria.

## Licença

Projeto Interdisciplinar para a **Fatec Zona Leste**.

Todos os direitos reservados © 2026.
