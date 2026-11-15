/* =====================================================================
   Idioma: inglês (padrão) ou português.
   O <head> do index.html já decide o idioma antes de pintar a página
   (?lang= na URL, senão a última escolha salva) e marca <html lang>.
   Os textos fixos do HTML vêm nas duas línguas (data-l="en" / data-l="pt")
   e o CSS esconde a outra. Os textos gerados pelo JS usam L(pt, en).
   Trocar de idioma recarrega a página com a mesma receita (#c=...).
   ===================================================================== */
export const EN = document.documentElement.lang !== 'pt-BR';
export const LOCALE = EN ? 'en-US' : 'pt-BR';
export const VOZ = EN ? 'en-US' : 'pt-BR';

/** Escolhe o texto do idioma atual. */
export const L = (pt, en) => (EN ? en : pt);

/** Atributos que não cabem em <span data-l>: aria-label, title e textos de <option>. */
export function aplicarIdioma() {
  if (!EN) return;
  document.querySelectorAll('[data-aria-en]').forEach(el => el.setAttribute('aria-label', el.dataset.ariaEn));
  document.querySelectorAll('option[data-en]').forEach(el => { el.textContent = el.dataset.en; });
  const desc = document.querySelector('meta[name="description"]');
  if (desc?.dataset.en) desc.content = desc.dataset.en;
}

export function trocarIdioma() {
  const nova = EN ? 'pt' : 'en';
  try { localStorage.setItem('jam-lingua', nova); } catch { /* sem armazenamento: a URL guarda a escolha */ }
  location.href = `${location.pathname}?lang=${nova}${location.hash}`;
}
