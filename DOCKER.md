# 🐳 Guia Docker

Este guia explica como usar Docker para executar a aplicação localmente e em produção.

## 📋 Pré-requisitos

- Docker instalado ([Instalar Docker](https://docs.docker.com/get-docker/))
- Docker Compose instalado (geralmente vem com Docker Desktop)
- Variável de ambiente `GEMINI_API_KEY` configurada

## 🚀 Uso Local

### Opção 1: Docker Compose (Recomendado)

1. Configure a variável de ambiente:
   ```bash
   export GEMINI_API_KEY=sua_chave_aqui
   ```

2. Inicie o container:
   ```bash
   npm run docker:up
   # ou
   docker-compose up -d
   ```

3. Acesse a aplicação:
   - URL: http://localhost:9966

4. Parar o container:
   ```bash
   npm run docker:down
   # ou
   docker-compose down
   ```

### Opção 2: Docker CLI

1. Build da imagem:
   ```bash
   npm run docker:build
   # ou
   docker build -t assessor-de-lotacao:latest --build-arg GEMINI_API_KEY=$GEMINI_API_KEY .
   ```

2. Executar container:
   ```bash
   npm run docker:run
   # ou
   docker run -d -p 9966:9966 --name assessor-de-lotacao --restart unless-stopped assessor-de-lotacao:latest
   ```

3. Ver logs:
   ```bash
   npm run docker:logs
   # ou
   docker logs -f assessor-de-lotacao
   ```

4. Parar container:
   ```bash
   npm run docker:stop
   docker rm assessor-de-lotacao
   ```

## 🏗️ Estrutura Docker

### Dockerfile

O Dockerfile usa multi-stage build:
- **Stage 1 (builder)**: Build da aplicação React/Vite
- **Stage 2 (production)**: Nginx servindo arquivos estáticos na porta 9966

### Nginx Configuration

O arquivo `nginx.conf` configura:
- Porta 9966
- Compressão GZIP
- Cache de arquivos estáticos
- Suporte a SPA (Single Page Application)
- Headers de segurança

## 🔧 Comandos Úteis

### Verificar status do container
```bash
docker ps --filter "name=assessor-de-lotacao"
```

### Entrar no container
```bash
docker exec -it assessor-de-lotacao sh
```

### Ver logs em tempo real
```bash
docker logs -f assessor-de-lotacao
```

### Reiniciar container
```bash
docker restart assessor-de-lotacao
```

### Remover tudo (container + imagem)
```bash
docker stop assessor-de-lotacao
docker rm assessor-de-lotacao
docker rmi assessor-de-lotacao:latest
```

## 🚀 Deploy em Produção

O deploy automático via GitHub Actions:
1. Faz build da imagem Docker
2. Envia a imagem para o servidor
3. Para o container antigo
4. Inicia o novo container na porta 9966

### Requisitos do Servidor

- Docker instalado
- Porta 9966 disponível
- Acesso SSH configurado

### Verificar Docker no Servidor

```bash
docker --version
docker-compose --version
```

## 🐛 Troubleshooting

### Container não inicia
```bash
# Ver logs
docker logs assessor-de-lotacao

# Verificar se a porta está em uso
netstat -tuln | grep 9966
# ou
lsof -i :9966
```

### Porta 9966 já está em uso
```bash
# Parar container usando a porta
docker ps | grep 9966
docker stop <container_id>

# Ou mudar a porta no docker-compose.yml
# Alterar "9966:9966" para "9967:9966"
```

### Erro de build
```bash
# Limpar cache do Docker
docker builder prune

# Rebuild sem cache
docker build --no-cache -t assessor-de-lotacao:latest .
```

### Variável de ambiente não funciona
- Certifique-se de que `GEMINI_API_KEY` está definida antes do build
- No Docker Compose, configure no arquivo `.env` ou exporte antes de executar

## 📝 Variáveis de Ambiente

A aplicação usa a variável `GEMINI_API_KEY` que é injetada durante o build da imagem Docker.

**Importante**: A chave é incluída na imagem durante o build, não em runtime. Para alterar, é necessário fazer rebuild da imagem.

## 🔒 Segurança

- A imagem Docker não expõe variáveis sensíveis em runtime
- Nginx está configurado com headers de segurança
- Arquivos sensíveis são ignorados via `.dockerignore`

## 📊 Monitoramento

### Healthcheck

O container inclui healthcheck que verifica se a aplicação está respondendo:
```bash
docker inspect --format='{{.State.Health.Status}}' assessor-de-lotacao
```

### Métricas

```bash
# Uso de recursos
docker stats assessor-de-lotacao

# Informações do container
docker inspect assessor-de-lotacao
```

