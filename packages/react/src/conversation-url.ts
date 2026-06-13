export function readConversationIdFromUrl(): string | null {
  if (typeof window === 'undefined') return null;

  const value = new URLSearchParams(window.location.search).get('conversationId')?.trim();
  return value || null;
}

export function writeConversationIdToUrl(conversationId: string | null): void {
  if (typeof window === 'undefined') return;

  const url = new URL(window.location.href);
  if (conversationId) {
    url.searchParams.set('conversationId', conversationId);
  } else {
    url.searchParams.delete('conversationId');
  }

  const next = `${url.pathname}${url.search}${url.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next !== current) {
    window.history.replaceState(window.history.state, '', next);
  }
}
