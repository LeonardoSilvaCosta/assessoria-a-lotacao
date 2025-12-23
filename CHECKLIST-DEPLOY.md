# ✅ Checklist de Deploy - Hostinger

## 📋 Pré-Deploy

### Configuração do GitHub Secrets

Certifique-se de que os seguintes secrets estão configurados no GitHub:
- [ ] `GEMINI_API_KEY` - Chave da API do Gemini
- [ ] `SSH_HOST` - Host SSH da Hostinger (ex: `ssh.hostinger.com` ou IP)
- [ ] `SSH_USER` - Usuário SSH
- [ ] `SSH_PRIVATE_KEY` - Chave privada SSH (ou use `SSH_PASSWORD`)
- [ ] `SSH_PASSWORD` - Senha SSH (opcional, se não usar chave)
- [ ] `SSH_PORT` - Porta SSH (opcional, padrão: 22)
- [ ] `DEPLOY_PATH` - Caminho de deploy (opcional, padrão: `app/assessor-de-lotacao`)

### Verificações de Código

- [x] ✅ `vite.config.ts` configurado com otimizações de produção
- [x] ✅ `package.json` com `terser` como dependência
- [x] ✅ `.htaccess` criado na pasta `public/`
- [x] ✅ Workflow SSH completo com upload de arquivos
- [x] ✅ Build configurado para produção

### Dependências

Execute antes do deploy:
```bash
npm install
```

Isso garantirá que o `terser` seja instalado.

## 🚀 Deploy

### Opção 1: Deploy Automático
1. Faça push para a branch `main` ou `master`:
   ```bash
   git push origin main
   ```

### Opção 2: Deploy Manual
1. Acesse: GitHub → Actions → Deploy to Hostinger
2. Clique em "Run workflow"
3. Selecione a branch e execute

## 🔍 Verificações Pós-Deploy

Após o deploy, verifique:

- [ ] Site acessível no navegador
- [ ] Console do navegador sem erros (F12)
- [ ] Arquivo `.htaccess` presente no servidor
- [ ] Arquivo `index.html` presente no servidor
- [ ] Pasta `assets/` com arquivos JS/CSS
- [ ] API do Gemini funcionando (teste a funcionalidade principal)

## 🐛 Troubleshooting

### Erro: "Cannot find module 'terser'"
**Solução:** Execute `npm install` localmente e faça commit do `package-lock.json`

### Erro: "Connection timeout" no SSH
**Solução:** 
- Verifique se `SSH_HOST` está correto
- Teste conexão SSH manualmente: `ssh usuario@host`
- Verifique se a porta está correta

### Erro: "Permission denied"
**Solução:**
- Verifique permissões do diretório no servidor
- O workflow tenta ajustar permissões automaticamente

### Erro: "Directory not found"
**Solução:**
- Verifique se `DEPLOY_PATH` está correto
- Crie o diretório manualmente se necessário: `mkdir -p app/assessor-de-lotacao`

### Site não carrega após deploy
**Solução:**
- Verifique se `.htaccess` foi copiado para a raiz
- Verifique logs do servidor no hPanel
- Teste acesso direto ao `index.html`

### Variável de ambiente não funciona
**Solução:**
- A `GEMINI_API_KEY` é injetada durante o build
- Certifique-se de que o secret está configurado corretamente
- Faça um novo build após alterar o secret

## 📝 Notas Importantes

1. **Variáveis de Ambiente**: A `GEMINI_API_KEY` é injetada no código durante o build. Não é necessário configurá-la no servidor.

2. **Arquivo .htaccess**: É copiado automaticamente da pasta `public/` para `dist/` durante o build.

3. **Otimizações**: O build remove `console.log` e `debugger` em produção, minifica o código e faz code splitting.

4. **Cache**: Os arquivos estáticos têm cache configurado no `.htaccess` para melhor performance.

