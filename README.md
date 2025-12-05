# Polys Frontend

Aplicação web frontend desenvolvida com React e Vite para a plataforma Polys. Este projeto fornece uma interface moderna e responsiva para gerenciamento de projetos comunitários, produtos, serviços e muito mais.

## 📋 Índice

- [Tecnologias](#tecnologias)
- [Pré-requisitos](#pré-requisitos)
- [Instalação](#instalação)
- [Configuração](#configuração)
- [Uso](#uso)
- [Scripts Disponíveis](#scripts-disponíveis)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Integração com Backend](#integração-com-backend)
- [Desenvolvimento](#desenvolvimento)
- [Build para Produção](#build-para-produção)

## 🛠 Tecnologias

- **React 18** - Biblioteca JavaScript para construção de interfaces
- **Vite 6** - Build tool e dev server de alta performance
- **React Router DOM 7** - Roteamento para aplicações React
- **Tailwind CSS 3** - Framework CSS utilitário
- **Radix UI** - Componentes acessíveis e não estilizados
- **React Hook Form** - Gerenciamento de formulários
- **Zod** - Validação de schemas TypeScript-first
- **TanStack Query** - Gerenciamento de estado do servidor
- **Leaflet** - Mapas interativos
- **Recharts** - Gráficos e visualizações
- **Framer Motion** - Animações

## 📦 Pré-requisitos

Antes de começar, certifique-se de ter instalado:

- **Node.js** (versão 18 ou superior)
- **Yarn** ou **npm** (gerenciador de pacotes)
- **Backend Polys** rodando e acessível (veja [Integração com Backend](#integração-com-backend))

## 🚀 Instalação

1. Clone o repositório:
```bash
git clone <url-do-repositorio>
cd Polys-Frontend
```

2. Instale as dependências:
```bash
yarn install
```
ou
```bash
npm install
```

## ⚙️ Configuração

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
# URL do backend API (padrão: http://localhost:3001)
VITE_API_URL=http://localhost:3001
```

**Nota:** Se a variável `VITE_API_URL` não for definida, o sistema utilizará `http://localhost:3001` como padrão.

### Configuração do Backend

Certifique-se de que o backend Polys está rodando e acessível na URL configurada. O frontend se comunica com o backend através de requisições HTTP REST.

## 💻 Uso

### Modo de Desenvolvimento

Para iniciar o servidor de desenvolvimento:

```bash
yarn dev
```
ou
```bash
npm run dev
```

O aplicativo estará disponível em `http://localhost:5173` (ou outra porta se 5173 estiver ocupada).

### Acessando a Aplicação

1. Abra seu navegador e acesse `http://localhost:5173`
2. Na página inicial, você pode:
   - Fazer login com suas credenciais
   - Registrar uma nova conta (se o registro estiver aberto)
   - Navegar pelas funcionalidades disponíveis

### Funcionalidades Principais

- **Autenticação**: Login, registro e gerenciamento de perfil
- **Projetos**: Criação, visualização e votação em projetos comunitários
- **Produtos**: Catálogo de produtos e sistema de pedidos
- **Serviços**: Agendamento e gerenciamento de serviços
- **Dashboard**: Painel administrativo com métricas e KPIs
- **Gestão de Usuários**: Controle de usuários e permissões (administradores)
- **Zonas e Residências**: Gerenciamento geográfico
- **Configurações**: Configurações da aplicação

## 📜 Scripts Disponíveis

### `yarn dev` ou `npm run dev`
Inicia o servidor de desenvolvimento com hot-reload.

### `yarn build` ou `npm run build`
Cria uma build de produção otimizada na pasta `dist/`.

### `yarn preview` ou `npm run preview`
Visualiza a build de produção localmente antes de fazer deploy.

### `yarn lint` ou `npm run lint`
Executa o linter ESLint para verificar problemas no código.

## 📁 Estrutura do Projeto

```
Polys-Frontend/
├── src/
│   ├── api/              # Cliente API e integrações
│   │   ├── entities.js    # Definições de entidades
│   │   ├── integrations.js
│   │   └── polysClient.js # Cliente principal da API
│   ├── components/        # Componentes React
│   │   ├── map/          # Componentes de mapa
│   │   ├── modals/       # Modais da aplicação
│   │   ├── products/     # Componentes de produtos
│   │   ├── projects/     # Componentes de projetos
│   │   ├── services/     # Componentes de serviços
│   │   ├── shared/       # Componentes compartilhados
│   │   └── ui/           # Componentes UI base (Radix UI)
│   ├── hooks/            # Custom hooks React
│   ├── lib/              # Utilitários e helpers
│   ├── pages/            # Páginas/rotas da aplicação
│   ├── utils/            # Funções utilitárias
│   ├── App.jsx           # Componente raiz
│   ├── App.css           # Estilos globais
│   ├── index.css         # Estilos base
│   └── main.jsx          # Ponto de entrada
├── public/               # Arquivos estáticos
├── index.html            # HTML principal
├── vite.config.js        # Configuração do Vite
├── tailwind.config.js    # Configuração do Tailwind
├── postcss.config.js     # Configuração do PostCSS
├── eslint.config.js      # Configuração do ESLint
├── package.json          # Dependências e scripts
└── README.md             # Este arquivo
```

## 🔌 Integração com Backend

O frontend se comunica com o backend através de requisições HTTP REST. As principais integrações incluem:

- **Autenticação**: `/auth/login`, `/auth/register`
- **Usuários**: `/users/me`, `/users/:id`
- **Projetos**: `/projects`, `/project-votes`, `/project-payments`
- **Produtos**: `/products`
- **Serviços**: `/services`
- **Configurações**: `/settings`

Todas as requisições autenticadas incluem um token Bearer no header `Authorization`.

### Autenticação

O sistema utiliza autenticação baseada em tokens JWT. Após o login bem-sucedido, o token é armazenado no `localStorage` e incluído automaticamente em todas as requisições subsequentes.

## 🛠 Desenvolvimento

### Adicionando Novos Componentes

Componentes devem ser criados na pasta `src/components/` seguindo a estrutura de pastas existente.

### Adicionando Novas Páginas

Novas páginas devem ser criadas em `src/pages/` e adicionadas ao roteador em `src/App.jsx`.

### Estilização

O projeto utiliza Tailwind CSS para estilização. Componentes base estão em `src/components/ui/` e podem ser customizados conforme necessário.

### Linting

Execute o linter antes de fazer commit:
```bash
yarn lint
```

## 🏗 Build para Produção

1. Crie o build de produção:
```bash
yarn build
```

2. Os arquivos otimizados estarão na pasta `dist/`

3. Para testar o build localmente:
```bash
yarn preview
```

4. Para fazer deploy, você pode:
   - Servir a pasta `dist/` com qualquer servidor web estático (Nginx, Apache, etc.)
   - Usar serviços como Vercel, Netlify, ou AWS S3 + CloudFront

### Variáveis de Ambiente em Produção

Certifique-se de configurar a variável `VITE_API_URL` no ambiente de produção apontando para a URL do backend em produção.

## 📝 Notas Importantes

- O projeto utiliza **Yarn** como gerenciador de pacotes padrão (há um `yarn.lock` no repositório)
- Todas as operações de dados críticas (projetos, produtos, serviços) são processadas através do backend
- O `localStorage` é usado apenas para cache de autenticação e dados temporários
- Certifique-se de que o backend está rodando antes de iniciar o frontend

## 🐛 Troubleshooting

### Erro de conexão com o backend
- Verifique se o backend está rodando
- Confirme que a URL em `VITE_API_URL` está correta
- Verifique se há problemas de CORS no backend

### Erro ao instalar dependências
- Certifique-se de estar usando Node.js 18+
- Tente limpar o cache: `yarn cache clean` ou `npm cache clean --force`
- Delete `node_modules` e `yarn.lock`/`package-lock.json` e reinstale

### Problemas de build
- Verifique se todas as dependências estão instaladas
- Execute `yarn lint` para verificar erros no código
- Certifique-se de que não há erros de sintaxe

## 📄 Licença

Este projeto é proprietário e está protegido por direitos autorais. Consulte o arquivo `LICENSE` para mais informações sobre os termos de uso.

## 👥 Suporte

Para suporte e dúvidas, entre em contato com a equipe de desenvolvimento do projeto Polys.

---

**Desenvolvido com ❤️ para a plataforma Polys**
