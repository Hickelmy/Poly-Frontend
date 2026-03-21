/**
 * useActivityTracker
 *
 * Coleta eventos comportamentais não-sensíveis (pageview, clique, busca, filtro)
 * e os envia em lote ao backend a cada 30 s ou quando a aba é fechada.
 *
 * Dados coletados:
 *   - Rota acessada (page)
 *   - Tipo de ação (action)
 *   - Identificador de elemento via atributo data-track (target)
 *   - Metadados não-sensíveis (termo de busca, filtro selecionado)
 *   - Tempo na página anterior (duration em segundos)
 *   - sessionId: UUID aleatório armazenado em sessionStorage (por aba)
 *
 * Dados NUNCA coletados:
 *   - Conteúdo digitado em campos de texto/senha
 *   - Dados pessoais, financeiros ou sensíveis
 */

import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

const SESSION_KEY = 'polys-session-id';
const FLUSH_INTERVAL_MS = 30_000;
const MAX_BUFFER = 50;

function getSessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

interface TrackEvent {
  sessionId: string;
  page: string;
  action: string;
  target?: string;
  metadata?: Record<string, string | number | boolean>;
  duration?: number;
}

let buffer: TrackEvent[] = [];
let lastPage = '';
let lastPageTime = Date.now();

function flush(token: string | null) {
  if (!token || buffer.length === 0) return;
  const payload = JSON.stringify({ events: buffer.splice(0) });
  const url = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/events/batch`;
  // sendBeacon works even when the page is closing
  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    const blob = new Blob([payload], { type: 'application/json' });
    // sendBeacon doesn't support auth headers; fall back to fetch when tab is alive
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  }
}

export function useActivityTracker() {
  const location = useLocation();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tokenRef = useRef<string | null>(null);

  // Keep token in ref so flush() can access without re-subscribing
  useEffect(() => {
    tokenRef.current = localStorage.getItem('polys-auth-token');
  });

  // Track page views + time spent on previous page
  useEffect(() => {
    const sessionId = getSessionId();
    const now = Date.now();
    const duration = lastPage
      ? Math.round((now - lastPageTime) / 1000)
      : undefined;

    const event: TrackEvent = {
      sessionId,
      page: location.pathname,
      action: 'pageview',
      duration,
    };

    buffer.push(event);
    lastPage = location.pathname;
    lastPageTime = now;

    if (buffer.length >= MAX_BUFFER) flush(tokenRef.current);
  }, [location.pathname]);

  // Global click listener — only fires on elements with data-track attribute
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest('[data-track]');
      if (!target) return;
      const label = (target as HTMLElement).dataset.track ?? 'unknown';
      buffer.push({
        sessionId: getSessionId(),
        page: location.pathname,
        action: 'click',
        target: label,
      });
      if (buffer.length >= MAX_BUFFER) flush(tokenRef.current);
    };
    document.addEventListener('click', handleClick, { passive: true });
    return () => document.removeEventListener('click', handleClick);
  }, [location.pathname]);

  // Periodic flush
  useEffect(() => {
    timerRef.current = setInterval(() => flush(tokenRef.current), FLUSH_INTERVAL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Flush on tab close / page hide
  useEffect(() => {
    const onHide = () => flush(tokenRef.current);
    window.addEventListener('pagehide', onHide);
    window.addEventListener('beforeunload', onHide);
    return () => {
      window.removeEventListener('pagehide', onHide);
      window.removeEventListener('beforeunload', onHide);
    };
  }, []);

  /** Track a custom event from any component. */
  const track = useCallback(
    (action: string, target?: string, metadata?: Record<string, string | number | boolean>) => {
      buffer.push({
        sessionId: getSessionId(),
        page: location.pathname,
        action,
        target,
        metadata,
      });
      if (buffer.length >= MAX_BUFFER) flush(tokenRef.current);
    },
    [location.pathname],
  );

  return { track };
}
