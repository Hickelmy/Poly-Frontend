/**
 * Utilitário de criptografia para dados sensíveis
 * Usa Web Crypto API com AES-GCM para criptografia simétrica
 * A chave é derivada de uma chave mestre armazenada no backend
 */

// Chave de criptografia (em produção, deve vir do backend via API segura)
// Por enquanto, usamos uma chave derivada do email do usuário + uma chave secreta do backend
const ENCRYPTION_KEY_NAME = 'polys-encryption-key';

/**
 * Deriva uma chave de criptografia a partir de uma string
 */
async function deriveKey(password, salt) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Obtém ou cria a chave de criptografia
 * 
 * IMPORTANTE: A chave mestre deve ser configurada via variável de ambiente
 * REACT_APP_ENCRYPTION_MASTER_KEY e DEVE SER A MESMA do backend
 * 
 * A chave é derivada de: MASTER_KEY + EMAIL_USUARIO
 * Isso garante que cada usuário tenha sua própria chave única
 */
async function getEncryptionKey(userEmail) {
  // Busca a chave mestre da variável de ambiente
  // Em Vite, variáveis de ambiente começam com VITE_
  const masterKey = import.meta.env.VITE_ENCRYPTION_MASTER_KEY 
    || import.meta.env.REACT_APP_ENCRYPTION_MASTER_KEY 
    || 'polys-master-key-change-in-production';
  
  // Debug: verificar se a chave está sendo lida
  console.log('🔑 Frontend - Chave de criptografia:', {
    VITE_ENCRYPTION_MASTER_KEY: import.meta.env.VITE_ENCRYPTION_MASTER_KEY ? '✅ Configurada' : '❌ Não configurada',
    REACT_APP_ENCRYPTION_MASTER_KEY: import.meta.env.REACT_APP_ENCRYPTION_MASTER_KEY ? '✅ Configurada' : '❌ Não configurada',
    masterKeyLength: masterKey.length,
    isDefault: masterKey === 'polys-master-key-change-in-production',
    preview: masterKey.substring(0, 10) + '...'
  });
  
  if (masterKey === 'polys-master-key-change-in-production') {
    console.warn('⚠️ ATENÇÃO: Usando chave padrão de desenvolvimento. Configure VITE_ENCRYPTION_MASTER_KEY no .env.local');
  } else {
    console.log('✅ Frontend - Usando chave mestre configurada');
  }
  
  // Deriva chave única por usuário: MASTER_KEY + EMAIL
  const keyString = `${masterKey}-${userEmail}`;
  
  const encoder = new TextEncoder();
  // Salt fixo (pode ser melhorado para salt único por usuário no futuro)
  const salt = encoder.encode('polys-salt-fixed');
  
  return deriveKey(keyString, salt);
}

/**
 * Criptografa um texto usando AES-GCM
 */
export async function encrypt(text, userEmail) {
  if (!text) return null;
  
  try {
    const key = await getEncryptionKey(userEmail);
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    
    console.log(`🔐 Frontend - Criptografando para ${userEmail}:`, {
      textLength: text.length,
      dataLength: data.length,
      textPreview: text.substring(0, 20) + '...'
    });
    
    // Gera um IV (Initialization Vector) aleatório
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Criptografa os dados
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      data
    );
    
    console.log(`🔐 Frontend - Dados criptografados:`, {
      ivLength: iv.length,
      encryptedLength: encrypted.byteLength,
      totalLength: iv.length + encrypted.byteLength
    });
    
    // No Web Crypto API, o auth tag já vem automaticamente no final do encrypted
    // Formato: IV (12 bytes) + ciphertext + auth tag (16 bytes)
    // Combina IV + dados criptografados (que já inclui o auth tag) e converte para base64
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    const base64Result = btoa(String.fromCharCode(...combined));
    console.log(`🔐 Frontend - Resultado base64 (primeiros 50 chars): ${base64Result.substring(0, 50)}...`);
    
    return base64Result;
  } catch (error) {
    console.error('Erro ao criptografar:', error);
    throw new Error('Falha ao criptografar dados');
  }
}

/**
 * Descriptografa um texto criptografado
 */
export async function decrypt(encryptedText, userEmail) {
  if (!encryptedText) return null;
  
  try {
    const key = await getEncryptionKey(userEmail);
    
    // Decodifica de base64
    const combined = Uint8Array.from(atob(encryptedText), c => c.charCodeAt(0));
    
    // Extrai IV (12 bytes) e dados criptografados (que já inclui o auth tag)
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);
    
    // Descriptografa (o Web Crypto API extrai o auth tag automaticamente)
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      encrypted
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Erro ao descriptografar:', error);
    throw new Error('Falha ao descriptografar dados');
  }
}

/**
 * Criptografa um objeto com campos sensíveis
 */
export async function encryptObject(obj, sensitiveFields, userEmail) {
  if (!obj || !userEmail) return obj;
  
  const encrypted = { ...obj };
  
  for (const field of sensitiveFields) {
    if (encrypted[field] && typeof encrypted[field] === 'string') {
      encrypted[field] = await encrypt(encrypted[field], userEmail);
    }
  }
  
  return encrypted;
}

/**
 * Descriptografa um objeto com campos sensíveis
 */
export async function decryptObject(obj, sensitiveFields, userEmail) {
  if (!obj || !userEmail) return obj;
  
  const decrypted = { ...obj };
  
  for (const field of sensitiveFields) {
    if (decrypted[field] && typeof decrypted[field] === 'string') {
      try {
        decrypted[field] = await decrypt(decrypted[field], userEmail);
      } catch (error) {
        // Se falhar, pode ser que o campo não esteja criptografado (dados antigos)
        console.warn(`Campo ${field} não pôde ser descriptografado, mantendo original`);
      }
    }
  }
  
  return decrypted;
}

/**
 * Lista de campos sensíveis que devem ser criptografados
 */
export const SENSITIVE_FIELDS = {
  USER: [
    'phone',
    'cep',
    'street',
    'houseNumber',
    'neighborhood',
    'pixKeyRandom',
    'pixKeyPhone',
    'pixKeyEmail',
    'pixKeyCpf',
  ],
  ADDRESS: [
    'street',
    'houseNumber',
    'neighborhood',
    'cep',
    'phone',
  ],
  PAYMENT: [
    'pixKeyRandom',
    'pixKeyPhone',
    'pixKeyEmail',
    'pixKeyCpf',
    'cardNumber',
    'cardCvv',
  ],
};

