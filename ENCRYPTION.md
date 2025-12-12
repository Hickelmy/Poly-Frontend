# 🔐 Sistema de Criptografia - Frontend

## Como Funciona

O sistema usa **Web Crypto API** com **AES-256-GCM** para criptografar dados sensíveis antes de enviar ao backend.

### Processo de Criptografia

1. **Chave Mestre** (variável de ambiente `REACT_APP_ENCRYPTION_MASTER_KEY`)
2. **Derivação:** `MASTER_KEY + EMAIL_USUARIO` → PBKDF2 (100.000 iterações)
3. **Criptografia:** AES-256-GCM com IV aleatório
4. **Envio:** Dados criptografados em base64 são enviados ao backend

### Configuração

Crie um arquivo `.env.local` na raiz do projeto:

```env
# DEVE SER A MESMA CHAVE DO BACKEND!
REACT_APP_ENCRYPTION_MASTER_KEY=sua-chave-mestre-super-secreta-aqui
```

**Como gerar a chave:**
```powershell
# Windows PowerShell (na pasta Polys-Backend)
.\generate-encryption-key.ps1

# Ou comando direto
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

**⚠️ IMPORTANTE:**
- A chave **DEVE SER EXATAMENTE A MESMA** do backend
- Use chaves diferentes para dev e produção
- **NUNCA** commite o arquivo `.env.local` no Git

### Campos Criptografados

- `phone` - Telefone
- `cep` - CEP
- `street` - Rua/Logradouro
- `houseNumber` - Número da casa
- `neighborhood` - Bairro
- `pixKeyRandom` - Chave PIX aleatória
- `pixKeyPhone` - Chave PIX telefone
- `pixKeyEmail` - Chave PIX email
- `pixKeyCpf` - Chave PIX CPF

### Uso

```javascript
import { encryptObject, SENSITIVE_FIELDS } from '@/utils/encryption';

// Criptografa dados antes de enviar
const encrypted = await encryptObject(
  userData,
  SENSITIVE_FIELDS.USER,
  userEmail
);

// Envia ao backend
await polysApi.auth.updateMe(encrypted);
```

O backend descriptografa automaticamente ao ler os dados.

