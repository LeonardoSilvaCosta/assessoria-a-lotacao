# 🐳 Dockerização da Aplicação

A aplicação foi dockerizada e está configurada para rodar na porta **9966**.

## 📦 Arquivos Criados

- ✅ `Dockerfile` - Multi-stage build (Node.js + Nginx)
- ✅ `docker-compose.yml` - Configuração para desenvolvimento/produção
- ✅ `nginx.conf` - Configuração do Nginx na porta 9966
- ✅ `.dockerignore` - Arquivos ignorados no build
- ✅ `.github/workflows/deploy-hostinger.yml` - Atualizado para deploy Docker

## 🚀 Como Usar

### Desenvolvimento Local

```bash
# Usando Docker Compose
export GEMINI_API_KEY=sua_chave
docker-compose up -d

# Acesse: http://localhost:9966
```

### Scripts NPM

```bash
npm run docker:build  # Build da imagem
npm run docker:run    # Executar container
npm run docker:logs   # Ver logs
npm run docker:stop   # Parar container
npm run docker:up     # Iniciar com docker-compose
npm run docker:down   # Parar docker-compose
```

## 🔧 Deploy Automático

O workflow GitHub Actions agora:
1. Faz build da imagem Docker
2. Envia a imagem para o servidor
3. Para o container antigo
4. Inicia o novo container na porta 9966

### Requisitos do Servidor

- Docker instalado
- Porta 9966 disponível
- Acesso SSH configurado

## 📝 Configuração

### Porta

A aplicação roda na porta **9966** conforme solicitado.

### Variáveis de Ambiente

A `GEMINI_API_KEY` é injetada durante o build da imagem Docker via build-arg.

## 📚 Documentação Completa

Consulte `DOCKER.md` para documentação detalhada sobre:
- Comandos Docker
- Troubleshooting
- Monitoramento
- Segurança

