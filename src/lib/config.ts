/** Endereço público do app. Única fonte para montar links copiáveis e compartilháveis. */
export const SITE_URL = "https://karate-sparring.lovable.app";

/** Mesmo endereço sem o "https://", para textos curtos (WhatsApp, cartões). */
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "");

export function siteUrl(caminho: string) {
  return `${SITE_URL}${caminho.startsWith("/") ? caminho : `/${caminho}`}`;
}

export const OG_IMAGE = `${SITE_URL}/og.jpg`;
