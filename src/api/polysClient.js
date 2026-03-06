// Cliente Polys: entidades em localStorage + autenticação integrada ao backend.

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const DB_KEY = 'polys-local-db-v1';
const AUTH_KEY = 'polys-auth-user-id';
const TOKEN_KEY = 'polys-auth-token';
const REFRESH_TOKEN_KEY = 'polys-refresh-token';
const USER_CACHE_KEY = 'polys-auth-user-cache';

function getStorage() {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

function loadDb() {
  const storage = getStorage();
  if (!storage) {
    return createInitialDb();
  }
  try {
    const raw = storage.getItem(DB_KEY);
    if (!raw) {
      const initial = createInitialDb();
      storage.setItem(DB_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Erro ao carregar DB local, recriando...', e);
    const initial = createInitialDb();
    storage.setItem(DB_KEY, JSON.stringify(initial));
    return initial;
  }
}

function saveDb(db) {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(DB_KEY, JSON.stringify(db));
}

function createInitialDb() {
  // Banco local vazio - todos os dados devem vir do backend
  // Este banco é usado apenas para cache temporário e entidades não migradas
  return {
    users: [],
    zones: [],
    residences: [],
    projects: [],
    projectVotes: [],
    projectPayments: [],
    products: [],
    orders: [],
    services: [],
    serviceBookings: [],
    refundRequests: [],
    notifications: [],
    appSettings: [],
    auditLogs: [],
    adminRequests: [],
    inviteLinks: [],
  };
}

function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return String(Date.now()) + Math.random().toString(16).slice(2);
}

function sortItems(items, sortField) {
  if (!sortField) return items;
  const desc = sortField.startsWith('-');
  const field = desc ? sortField.slice(1) : sortField;
  return [...items].sort((a, b) => {
    const av = a[field];
    const bv = b[field];
    if (av === bv) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (av < bv) return desc ? 1 : -1;
    if (av > bv) return desc ? -1 : 1;
    return 0;
  });
}

function sanitizeUser(user) {
  if (!user) return null;
  const { password, ...rest } = user;
  return rest;
}

function mapBackendUserToLocal(user) {
  if (!user) return null;
  const now = new Date().toISOString();
  const rawRole = user.user_role || user.role || 'usuario';
  let normalizedRole = String(rawRole).toLowerCase();
  if (normalizedRole === 'user') normalizedRole = 'usuario';
  if (normalizedRole === 'admin' || normalizedRole === 'administrator') normalizedRole = 'administrador';
  if (normalizedRole === 'manager') normalizedRole = 'gestor';
  if (normalizedRole === 'support') normalizedRole = 'suporte';
  return {
    id: user.id,
    full_name: user.full_name || user.name || user.email,
    email: user.email,
    phone: user.phone || '',
    cep: user.cep || '',
    state: user.state || '',
    city: user.city || '',
    neighborhood: user.neighborhood || '',
    street: user.street || '',
    house_number: user.house_number || user.houseNumber || '',
    user_role: normalizedRole,
    avatar_url: user.avatar_url || user.avatarUrl || null,
    banner_url: user.banner_url || user.bannerUrl || null,
    pix_random: user.pix_random || user.pixKeyRandom || '',
    pix_phone: user.pix_phone || user.pixKeyPhone || '',
    pix_email: user.pix_email || user.pixKeyEmail || '',
    pix_cpf: user.pix_cpf || user.pixKeyCpf || '',
    email_confirmed: user.email_confirmed ?? true,
    created_date: user.createdAt || now,
  };
}

let isRefreshing = false;
let refreshPromise = null;

async function tryRefreshToken() {
  const storage = getStorage();
  const refreshToken = storage?.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!res.ok) return false;

    const data = await res.json();
    if (data.access_token && data.refresh_token) {
      storage.setItem(TOKEN_KEY, data.access_token);
      storage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

async function apiRequest(path, options = {}) {
  const storage = getStorage();
  let token = storage?.getItem(TOKEN_KEY);

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  // Auto-refresh on 401
  if (res.status === 401 && storage?.getItem(REFRESH_TOKEN_KEY) && !path.includes('/auth/refresh')) {
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = tryRefreshToken().finally(() => {
        isRefreshing = false;
        refreshPromise = null;
      });
    }

    const refreshed = await (refreshPromise || tryRefreshToken());

    if (refreshed) {
      token = storage.getItem(TOKEN_KEY);
      headers.Authorization = `Bearer ${token}`;
      res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
    } else {
      storage.removeItem(TOKEN_KEY);
      storage.removeItem(REFRESH_TOKEN_KEY);
      storage.removeItem(AUTH_KEY);
      storage.removeItem(USER_CACHE_KEY);
    }
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    // ignore parse error
  }

  if (!res.ok) {
    const message = data?.message || 'Erro na requisição';
    throw new Error(message);
  }

  return data;
}

const entityCollections = {
  Zone: 'zones',
  Residence: 'residences',
  // Entidades de projeto são tratadas via backend real
  Project: 'projects',
  ProjectVote: 'projectVotes',
  ProjectPayment: 'projectPayments',
  Product: 'products',
  Order: 'orders',
  Service: 'services',
  ServiceBooking: 'serviceBookings',
  RefundRequest: 'refundRequests',
  Notification: 'notifications',
  AppSettings: 'appSettings',
  AuditLog: 'auditLogs',
  AdminRequest: 'adminRequests',
  InviteLink: 'inviteLinks',
};

function makeEntityApi(entityName) {
  // Products, Services e Projects usam o backend real
  if (entityName === 'Product') {
    return {
      async list(sortField = '-created_date', limit) {
        const params = new URLSearchParams();
        if (sortField) params.set('sort', sortField);
        if (typeof limit === 'number') params.set('limit', String(limit));
        return apiRequest(`/products?${params.toString()}`, { method: 'GET' });
      },

      async filter(where = {}, sortField, limit) {
        const params = new URLSearchParams();
        if (sortField) params.set('sort', sortField);
        if (typeof limit === 'number') params.set('limit', String(limit));
        Object.entries(where).forEach(([key, value]) => {
          if (value === undefined || value === null) return;
          params.set(key, String(value));
        });
        return apiRequest(`/products?${params.toString()}`, { method: 'GET' });
      },

      async create(data) {
        return apiRequest('/products', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      },

      async update(id, data) {
        return apiRequest(`/products/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        });
      },

      async delete(id) {
        return apiRequest(`/products/${id}`, {
          method: 'DELETE',
        });
      },
    };
  }

  if (entityName === 'Service') {
    return {
      async list(sortField = '-created_date', limit) {
        const params = new URLSearchParams();
        if (sortField) params.set('sort', sortField);
        if (typeof limit === 'number') params.set('limit', String(limit));
        return apiRequest(`/services?${params.toString()}`, { method: 'GET' });
      },

      async filter(where = {}, sortField, limit) {
        const params = new URLSearchParams();
        if (sortField) params.set('sort', sortField);
        if (typeof limit === 'number') params.set('limit', String(limit));
        Object.entries(where).forEach(([key, value]) => {
          if (value === undefined || value === null) return;
          params.set(key, String(value));
        });
        return apiRequest(`/services?${params.toString()}`, { method: 'GET' });
      },

      async create(data) {
        return apiRequest('/services', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      },

      async update(id, data) {
        return apiRequest(`/services/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        });
      },

      async delete(id) {
        return apiRequest(`/services/${id}`, {
          method: 'DELETE',
        });
      },
    };
  }

  if (entityName === 'Project') {
    return {
      async list(sortField = '-created_date', limit) {
        const params = new URLSearchParams();
        if (sortField) params.set('sort', sortField);
        if (typeof limit === 'number') params.set('limit', String(limit));
        return apiRequest(`/projects?${params.toString()}`, { method: 'GET' });
      },

      async filter(where = {}, sortField, limit) {
        const params = new URLSearchParams();
        if (sortField) params.set('sort', sortField);
        if (typeof limit === 'number') params.set('limit', String(limit));
        Object.entries(where).forEach(([key, value]) => {
          if (value === undefined || value === null) return;
          params.set(key, String(value));
        });
        return apiRequest(`/projects?${params.toString()}`, { method: 'GET' });
      },

      async create(data) {
        return apiRequest('/projects', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      },

      async update(id, data) {
        return apiRequest(`/projects/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        });
      },

      async delete(id) {
        return apiRequest(`/projects/${id}`, {
          method: 'DELETE',
        });
      },
    };
  }

  if (entityName === 'ProjectVote') {
    return {
      async list(sortField = '-created_date', limit) {
        const params = new URLSearchParams();
        if (sortField) params.set('sort', sortField);
        if (typeof limit === 'number') params.set('limit', String(limit));
        return apiRequest(`/project-votes?${params.toString()}`, { method: 'GET' });
      },

      async filter(where = {}, sortField, limit) {
        const params = new URLSearchParams();
        if (sortField) params.set('sort', sortField);
        if (typeof limit === 'number') params.set('limit', String(limit));
        Object.entries(where).forEach(([key, value]) => {
          if (value === undefined || value === null) return;
          params.set(key, String(value));
        });
        return apiRequest(`/project-votes?${params.toString()}`, { method: 'GET' });
      },

      async create(data) {
        return apiRequest('/project-votes', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      },

      async delete(data) {
        return apiRequest('/project-votes', {
          method: 'DELETE',
          body: JSON.stringify(data),
        });
      },
    };
  }

  if (entityName === 'ProjectPayment') {
    return {
      async list(sortField = '-created_date', limit) {
        const params = new URLSearchParams();
        if (sortField) params.set('sort', sortField);
        if (typeof limit === 'number') params.set('limit', String(limit));
        return apiRequest(`/project-payments?${params.toString()}`, { method: 'GET' });
      },

      async filter(where = {}, sortField, limit) {
        const params = new URLSearchParams();
        if (sortField) params.set('sort', sortField);
        if (typeof limit === 'number') params.set('limit', String(limit));
        Object.entries(where).forEach(([key, value]) => {
          if (value === undefined || value === null) return;
          params.set(key, String(value));
        });
        return apiRequest(`/project-payments?${params.toString()}`, { method: 'GET' });
      },

      async create(data) {
        return apiRequest('/project-payments', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      },

      async update(id, data) {
        return apiRequest(`/project-payments/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        });
      },
    };
  }

  // Zone usa o backend
  if (entityName === 'Zone') {
    return {
      async list(sortField = 'name', limit) {
        const params = new URLSearchParams();
        if (sortField) params.set('orderBy', sortField);
        if (typeof limit === 'number') params.set('limit', String(limit));
        return apiRequest(`/zones?${params.toString()}`, { method: 'GET' });
      },

      async filter(where = {}, sortField, limit) {
        const params = new URLSearchParams();
        if (sortField) params.set('orderBy', sortField);
        if (typeof limit === 'number') params.set('limit', String(limit));
        Object.entries(where).forEach(([key, value]) => {
          if (value === undefined || value === null) return;
          params.set(key, String(value));
        });
        return apiRequest(`/zones?${params.toString()}`, { method: 'GET' });
      },

      async getOne(id) {
        return apiRequest(`/zones/${id}`, { method: 'GET' });
      },

      async create(data) {
        return apiRequest('/zones', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      },

      async update(id, data) {
        return apiRequest(`/zones/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
      },

      async delete(id) {
        return apiRequest(`/zones/${id}`, {
          method: 'DELETE',
        });
      },
    };
  }

  if (entityName === 'Service') {
    return {
      async list(sortField = '-created_date', limit) {
        const params = new URLSearchParams();
        if (sortField) params.set('sort', sortField);
        if (typeof limit === 'number') params.set('limit', String(limit));
        return apiRequest(`/services?${params.toString()}`, { method: 'GET' });
      },

      async filter(where = {}, sortField, limit) {
        const params = new URLSearchParams();
        if (sortField) params.set('sort', sortField);
        if (typeof limit === 'number') params.set('limit', String(limit));
        Object.entries(where).forEach(([key, value]) => {
          if (value === undefined || value === null) return;
          params.set(key, String(value));
        });
        return apiRequest(`/services?${params.toString()}`, { method: 'GET' });
      },

      async create(data) {
        return apiRequest('/services', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      },

      async update(id, data) {
        return apiRequest(`/services/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        });
      },

      async delete(id) {
        return apiRequest(`/services/${id}`, {
          method: 'DELETE',
        });
      },
    };
  }

  if (entityName === 'ServiceBooking') {
    return {
      async list(sortField = '-created_date', limit) {
        const params = new URLSearchParams();
        if (sortField) params.set('sort', sortField);
        if (typeof limit === 'number') params.set('limit', String(limit));
        return apiRequest(`/service-bookings?${params.toString()}`, { method: 'GET' });
      },

      async filter(where = {}, sortField, limit) {
        const params = new URLSearchParams();
        if (sortField) params.set('sort', sortField);
        if (typeof limit === 'number') params.set('limit', String(limit));
        Object.entries(where).forEach(([key, value]) => {
          if (value === undefined || value === null) return;
          params.set(key, String(value));
        });
        return apiRequest(`/service-bookings?${params.toString()}`, { method: 'GET' });
      },

      async create(data) {
        return apiRequest('/service-bookings', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      },

      async update(id, data) {
        return apiRequest(`/service-bookings/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        });
      },

      async verifyCode(id, data) {
        return apiRequest(`/service-bookings/${id}/verify-code`, {
          method: 'POST',
          body: JSON.stringify(data),
        });
      },

      async delete(id) {
        return apiRequest(`/service-bookings/${id}`, {
          method: 'DELETE',
        });
      },
    };
  }

  // Outras entidades continuam usando o "banco" local
  const collection = entityCollections[entityName];
  if (!collection) {
    throw new Error(`Coleção desconhecida: ${entityName}`);
  }

  return {
    async list(sortField = '-created_date', limit) {
      const db = loadDb();
      let items = db[collection] || [];
      items = sortItems(items, sortField);
      if (typeof limit === 'number') {
        items = items.slice(0, limit);
      }
      return items;
    },

    async filter(where = {}, sortField, limit) {
      const db = loadDb();
      let items = db[collection] || [];
      items = items.filter((item) =>
        Object.entries(where).every(([key, value]) => item[key] === value),
      );
      items = sortItems(items, sortField);
      if (typeof limit === 'number') {
        items = items.slice(0, limit);
      }
      return items;
    },

    async create(data) {
      const db = loadDb();
      const now = new Date().toISOString();
      const item = {
        id: generateId(),
        created_date: now,
        ...data,
      };
      db[collection] = [...(db[collection] || []), item];
      saveDb(db);
      return item;
    },

    async update(id, data) {
      const db = loadDb();
      const items = db[collection] || [];
      const index = items.findIndex((it) => it.id === id);
      if (index === -1) {
        throw new Error(`Registro não encontrado em ${collection}`);
      }
      const updated = { ...items[index], ...data };
      items[index] = updated;
      db[collection] = items;
      saveDb(db);
      return updated;
    },

    async delete(id) {
      const db = loadDb();
      db[collection] = (db[collection] || []).filter((it) => it.id !== id);
      saveDb(db);
      return { success: true };
    },
  };
}

// Função para limpar todos os dados do localStorage relacionados ao Polys
function clearAllLocalData() {
  const storage = getStorage();
  if (storage) {
    storage.removeItem(DB_KEY);
    storage.removeItem(AUTH_KEY);
    storage.removeItem(TOKEN_KEY);
    storage.removeItem(REFRESH_TOKEN_KEY);
    storage.removeItem(USER_CACHE_KEY);
    storage.removeItem('polys-selected-zone');
  }
}

const auth = {
  async loginWithGoogle(idToken) {
    const data = await apiRequest('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    });

    const mapped = mapBackendUserToLocal(data.user);

    const db = loadDb();
    const index = db.users.findIndex((u) => u.id === mapped.id);
    if (index === -1) {
      db.users.push({ ...mapped });
    } else {
      db.users[index] = { ...db.users[index], ...mapped };
    }
    saveDb(db);

    const storage = getStorage();
    if (storage) {
      storage.setItem(AUTH_KEY, mapped.id);
      storage.setItem(TOKEN_KEY, data.access_token);
      if (data.refresh_token) storage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
      storage.setItem(USER_CACHE_KEY, JSON.stringify(mapped));
    }
    return sanitizeUser(mapped);
  },

  async login({ email, password }) {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    const mapped = mapBackendUserToLocal(data.user);

    // Sincroniza com o "banco" local (para campos extras usados no app)
    const db = loadDb();
    const index = db.users.findIndex((u) => u.id === mapped.id);
    if (index === -1) {
      db.users.push({ ...mapped });
    } else {
      db.users[index] = { ...db.users[index], ...mapped };
    }
    saveDb(db);

    const storage = getStorage();
    if (storage) {
      storage.setItem(AUTH_KEY, mapped.id);
      storage.setItem(TOKEN_KEY, data.access_token);
      if (data.refresh_token) storage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
      storage.setItem(USER_CACHE_KEY, JSON.stringify(mapped));
    }
    return sanitizeUser(mapped);
  },

  async register({ full_name, email, password, role, phone, cep, state, city, neighborhood, street, houseNumber }) {
    const payload = {
      name: full_name,
      email,
      password,
      role,
    };

    // Adiciona campos de endereço se fornecidos (já vêm criptografados)
    if (phone) payload.phone = phone;
    if (cep) payload.cep = cep;
    if (state) payload.state = state;
    if (city) payload.city = city;
    if (neighborhood) payload.neighborhood = neighborhood;
    if (street) payload.street = street;
    if (houseNumber) payload.houseNumber = houseNumber;

    const data = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    // Opcional: já fazer login após registrar
    await auth.login({ email, password });

    return data;
  },

  async logout(redirectTo) {
    const storage = getStorage();
    const refreshToken = storage?.getItem(REFRESH_TOKEN_KEY);

    // Revoga o refresh token no servidor
    if (refreshToken) {
      try {
        await apiRequest('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
      } catch {
        // ignora erro de logout no servidor
      }
    }

    if (storage) {
      storage.removeItem(AUTH_KEY);
      storage.removeItem(TOKEN_KEY);
      storage.removeItem(REFRESH_TOKEN_KEY);
      storage.removeItem(USER_CACHE_KEY);
      storage.removeItem(DB_KEY);
    }
    if (redirectTo && typeof window !== 'undefined') {
      window.location.href = redirectTo;
    }
  },

  async me() {
    const storage = getStorage();
    if (!storage) throw new Error('Ambiente sem storage');

    // SEMPRE busca do backend para garantir dados atualizados e descriptografados
    // Não usa cache para evitar dados criptografados antigos
    try {
      const data = await apiRequest('/users/me', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      
      // O backend já descriptografa os dados antes de enviar
      const mapped = mapBackendUserToLocal(data);
      
      // Debug apenas em desenvolvimento
      if (import.meta.env.DEV) {
        console.log('Dados recebidos do backend (deve estar descriptografado):', {
          phone: mapped.phone?.substring(0, 20) + '...',
          cep: mapped.cep?.substring(0, 20) + '...',
          street: mapped.street?.substring(0, 20) + '...',
          neighborhood: mapped.neighborhood?.substring(0, 20) + '...',
        });
      }

      // Atualiza o cache local com dados descriptografados do backend
      const db = loadDb();
      const index = db.users.findIndex((u) => u.id === mapped.id);
      if (index === -1) {
        db.users.push({ ...mapped });
      } else {
        // Substitui completamente para garantir dados atualizados e descriptografados
        db.users[index] = { ...mapped };
      }
      saveDb(db);

      storage.setItem(AUTH_KEY, mapped.id);
      storage.setItem(USER_CACHE_KEY, JSON.stringify(mapped));

      return sanitizeUser(mapped);
    } catch (err) {
      // Se der 401 ou outro erro, considera não autenticado
      storage.removeItem(AUTH_KEY);
      storage.removeItem(TOKEN_KEY);
      storage.removeItem(USER_CACHE_KEY);
      throw err;
    }
  },

  async isAuthenticated() {
    const storage = getStorage();
    if (!storage) return false;
    const token = storage.getItem(TOKEN_KEY);
    return !!token;
  },

  async updateMe(data) {
    const storage = getStorage();
    if (!storage) throw new Error('Ambiente sem storage');
    const userId = storage.getItem(AUTH_KEY);
    if (!userId) {
      throw new Error('Não autenticado');
    }
    const db = loadDb();
    const index = db.users.findIndex((u) => u.id === userId);
    if (index === -1) {
      throw new Error('Usuário não encontrado');
    }

    const current = db.users[index];
    const userEmail = current.email || '';
    
    // Mapeia campos do frontend para o formato esperado pela criptografia
    const dataToEncrypt = { ...data };
    
    // Mapeia campos PIX do formato frontend (pix_random) para o formato backend (pixKeyRandom)
    if (data.pix_random !== undefined) dataToEncrypt.pixKeyRandom = data.pix_random;
    if (data.pix_phone !== undefined) dataToEncrypt.pixKeyPhone = data.pix_phone;
    if (data.pix_email !== undefined) dataToEncrypt.pixKeyEmail = data.pix_email;
    if (data.pix_cpf !== undefined) dataToEncrypt.pixKeyCpf = data.pix_cpf;
    
    // Mapeia house_number para houseNumber
    if (data.house_number !== undefined) dataToEncrypt.houseNumber = data.house_number;
    
    // Criptografa dados sensíveis antes de enviar ao backend
    const { encryptObject, SENSITIVE_FIELDS } = await import('../utils/encryption');
    const encryptedData = await encryptObject(dataToEncrypt, SENSITIVE_FIELDS.USER, userEmail);

    // Atualiza campos compatíveis também no backend (nome, role, avatar, banner)
    const backendPayload = {};
    if (encryptedData.full_name) backendPayload.name = encryptedData.full_name;
    if (encryptedData.user_role) backendPayload.role = encryptedData.user_role;
    if (encryptedData.avatar_url) backendPayload.avatarUrl = encryptedData.avatar_url;
    if (encryptedData.banner_url) backendPayload.bannerUrl = encryptedData.banner_url;
    
    // Campos PIX já vêm criptografados com os nomes corretos (pixKeyRandom, etc.)
    if (encryptedData.pixKeyRandom !== undefined) backendPayload.pixKeyRandom = encryptedData.pixKeyRandom;
    if (encryptedData.pixKeyPhone !== undefined) backendPayload.pixKeyPhone = encryptedData.pixKeyPhone;
    if (encryptedData.pixKeyEmail !== undefined) backendPayload.pixKeyEmail = encryptedData.pixKeyEmail;
    if (encryptedData.pixKeyCpf !== undefined) backendPayload.pixKeyCpf = encryptedData.pixKeyCpf;
    if (encryptedData.phone !== undefined) backendPayload.phone = encryptedData.phone;
    if (encryptedData.cep !== undefined) backendPayload.cep = encryptedData.cep;
    if (encryptedData.state !== undefined) backendPayload.state = encryptedData.state;
    if (encryptedData.city !== undefined) backendPayload.city = encryptedData.city;
    if (encryptedData.neighborhood !== undefined) backendPayload.neighborhood = encryptedData.neighborhood;
    if (encryptedData.street !== undefined) backendPayload.street = encryptedData.street;
    // houseNumber: usar o valor criptografado (encryptedData.houseNumber), não house_number
    if (encryptedData.houseNumber !== undefined) backendPayload.houseNumber = encryptedData.houseNumber;

    if (Object.keys(backendPayload).length === 0) {
      // Nada para atualizar - retorna usuário atual sem chamar API
      return sanitizeUser(current);
    }

    try {
      await apiRequest(`/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify(backendPayload),
      });
    } catch (e) {
      console.error('Erro ao atualizar usuário no backend', e);
      throw e;
    }

    // IMPORTANTE: Buscar dados atualizados do backend (que já vêm descriptografados)
    // Isso garante que o cache local sempre tenha dados descriptografados para exibição
    try {
      const updatedUserData = await apiRequest('/users/me', {
        method: 'GET',
      });
      const mapped = mapBackendUserToLocal(updatedUserData);
      
      // Atualizar cache local com dados descriptografados do backend
      db.users[index] = { ...db.users[index], ...mapped };
      saveDb(db);
      storage.setItem(USER_CACHE_KEY, JSON.stringify(mapped));
      
      return sanitizeUser(mapped);
    } catch (e) {
      console.error('Erro ao buscar dados atualizados do backend, usando dados locais', e);
      // Fallback: usar dados locais (mas sem criptografia para exibição)
      // Os dados sensíveis devem ser descriptografados do que foi enviado
      const updatedLocal = { ...current, ...data }; // Usar dados originais (não criptografados) para exibição
      db.users[index] = updatedLocal;
      saveDb(db);
      storage.setItem(USER_CACHE_KEY, JSON.stringify(updatedLocal));
      return sanitizeUser(updatedLocal);
    }
  },

  redirectToLogin(targetUrl) {
    if (typeof window === 'undefined') return;
    const params = targetUrl
      ? `?redirect=${encodeURIComponent(targetUrl)}`
      : '';
    window.location.href = `/Login${params}`;
  },
};

const integrations = {
  Core: {
    async UploadFile({ file }) {
      const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
      const MIN_SIZE_BYTES = 5 * 1024; // 5KB
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

      if (!allowedTypes.includes(file.type)) {
        throw new Error('Formato de imagem não suportado. Use JPG, PNG ou WEBP.');
      }

      if (file.size > MAX_SIZE_BYTES) {
        throw new Error('Imagem muito grande. Tamanho máximo: 2MB.');
      }

      if (file.size < MIN_SIZE_BYTES) {
        throw new Error('Imagem muito pequena ou corrompida. Tente outra imagem.');
      }

      const createOptimizedDataUrl = () =>
        new Promise((resolve, reject) => {
          const img = new Image();
          const url = URL.createObjectURL(file);

          img.onload = () => {
            try {
              const MAX_DIMENSION = 900;
              let { width, height } = img;

              const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
              width = Math.round(width * scale);
              height = Math.round(height * scale);

              const canvas = document.createElement('canvas');
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0, width, height);

              const quality = 0.75;
              const dataUrl = canvas.toDataURL('image/jpeg', quality);

              URL.revokeObjectURL(url);
              resolve(dataUrl);
            } catch (err) {
              reject(err);
            }
          };

          img.onerror = (err) => {
            URL.revokeObjectURL(url);
            reject(err);
          };

          img.src = url;
        });

      const dataUrl = await createOptimizedDataUrl();
      return { file_url: dataUrl };
    },

    async SendEmail({ to, subject, body }) {
      console.log('Mock envio de email:', { to, subject, body });
      return { success: true };
    },

    async InvokeLLM() {
      console.log('Mock InvokeLLM chamado');
      return { success: true };
    },

    async GenerateImage() {
      console.log('Mock GenerateImage chamado');
      return { success: true };
    },

    async ExtractDataFromUploadedFile() {
      console.log('Mock ExtractDataFromUploadedFile chamado');
      return { success: true };
    },

    async CreateFileSignedUrl() {
      console.log('Mock CreateFileSignedUrl chamado');
      return { success: true };
    },

    async UploadPrivateFile() {
      console.log('Mock UploadPrivateFile chamado');
      return { success: true };
    },
  },
};

const settings = {
  async get() {
    return apiRequest('/settings', { method: 'GET' });
  },

  async update(partial) {
    return apiRequest('/settings', {
      method: 'PATCH',
      body: JSON.stringify(partial),
    });
  },
};

// API Tokens (para integrações como Abacate Pay)
const apiTokens = {
  async list() {
    return apiRequest('/api-tokens', { method: 'GET' });
  },

  async get(id) {
    return apiRequest(`/api-tokens/${id}`, { method: 'GET' });
  },

  async create(data) {
    return apiRequest('/api-tokens', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id, data) {
    return apiRequest(`/api-tokens/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id) {
    return apiRequest(`/api-tokens/${id}`, { method: 'DELETE' });
  },

  async reorder(tokenIds) {
    return apiRequest('/api-tokens/reorder', {
      method: 'POST',
      body: JSON.stringify({ token_ids: tokenIds }),
    });
  },
};

// Gateway de Pagamento (integração com Abacate Pay)
const paymentGateway = {
  async createPixPayment(data) {
    return apiRequest('/payment-gateway/create-pix', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async generateQRCode(billingId) {
    return apiRequest('/payment-gateway/generate-qrcode', {
      method: 'POST',
      body: JSON.stringify({ billing_id: billingId }),
    });
  },

  async checkStatus(paymentId) {
    return apiRequest(`/payment-gateway/status/${paymentId}`, { method: 'GET' });
  },
  async createStripePayment(data) {
    return apiRequest('/payment-gateway/create-stripe', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// API de Notícias
const news = {
  async list(options = {}) {
    const params = new URLSearchParams();
    if (options.zoneId) params.set('zoneId', options.zoneId);
    if (options.publishedOnly !== undefined) params.set('publishedOnly', String(options.publishedOnly));
    if (options.limit) params.set('limit', String(options.limit));
    if (options.offset) params.set('offset', String(options.offset));
    return apiRequest(`/news?${params.toString()}`, { method: 'GET' });
  },

  async get(id) {
    return apiRequest(`/news/${id}`, { method: 'GET' });
  },

  async create(data) {
    return apiRequest('/news', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id, data) {
    return apiRequest(`/news/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async delete(id) {
    return apiRequest(`/news/${id}`, { method: 'DELETE' });
  },

  async like(id) {
    return apiRequest(`/news/${id}/like`, { method: 'POST' });
  },

  async unlike(id) {
    return apiRequest(`/news/${id}/like`, { method: 'DELETE' });
  },

  async getComments(id) {
    return apiRequest(`/news/${id}/comments`, { method: 'GET' });
  },

  async addComment(id, content) {
    return apiRequest(`/news/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  },

  async deleteComment(newsId, commentId) {
    return apiRequest(`/news/${newsId}/comments/${commentId}`, { method: 'DELETE' });
  },

  async report(id, reason, description) {
    return apiRequest(`/news/${id}/report`, {
      method: 'POST',
      body: JSON.stringify({ reason, description }),
    });
  },

  async getReports(options = {}) {
    const params = new URLSearchParams();
    if (options.newsId) params.set('newsId', options.newsId);
    if (options.status) params.set('status', options.status);
    return apiRequest(`/news/reports?${params.toString()}`, { method: 'GET' });
  },
};

// API de usuários
const users = {
  async me() {
    return auth.me();
  },

  async get(id) {
    return apiRequest(`/users/${id}`, { method: 'GET' });
  },

  async list(options = {}) {
    const params = new URLSearchParams();
    if (options.role) params.set('role', options.role);
    if (options.limit) params.set('limit', String(options.limit));
    return apiRequest(`/users?${params.toString()}`, { method: 'GET' });
  },

  async update(id, data) {
    return apiRequest(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
};

// Feature Flags API
const featureFlags = {
  async list(category) {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    return apiRequest(`/feature-flags?${params.toString()}`, { method: 'GET' });
  },

  async get(key) {
    return apiRequest(`/feature-flags/${key}`, { method: 'GET' });
  },

  async create(data) {
    return apiRequest('/feature-flags', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id, data) {
    return apiRequest(`/feature-flags/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async toggle(key, enabled) {
    return apiRequest(`/feature-flags/${key}/toggle`, {
      method: 'POST',
      body: JSON.stringify({ enabled }),
    });
  },

  async delete(id) {
    return apiRequest(`/feature-flags/${id}`, { method: 'DELETE' });
  },

  async evaluate(context = {}) {
    const params = new URLSearchParams();
    if (context.zoneId) params.set('zoneId', context.zoneId);
    if (context.city) params.set('city', context.city);
    if (context.state) params.set('state', context.state);
    if (context.userId) params.set('userId', context.userId);
    if (context.userRole) params.set('userRole', context.userRole);
    return apiRequest(`/feature-flags/evaluate?${params.toString()}`, { method: 'GET' });
  },

  async check(key, context = {}) {
    const params = new URLSearchParams();
    if (context.zoneId) params.set('zoneId', context.zoneId);
    if (context.city) params.set('city', context.city);
    if (context.state) params.set('state', context.state);
    if (context.userId) params.set('userId', context.userId);
    if (context.userRole) params.set('userRole', context.userRole);
    return apiRequest(`/feature-flags/check/${key}?${params.toString()}`, { method: 'GET' });
  },
};

export const polysApi = {
  auth,
  settings,
  apiTokens,
  paymentGateway,
  integrations,
  news,
  users,
  featureFlags,
  clearAllLocalData,
  entities: Object.keys(entityCollections).reduce((acc, name) => {
    acc[name] = makeEntityApi(name);
    return acc;
  }, {}),
};


