/**
 * @file Sistema de pestañas (CIDR / VLSM).
 *
 * Mantiene estado en el DOM vía clases CSS (`.active` en el botón,
 * `.hidden` en el panel) y conserva la última pestaña seleccionada en
 * `localStorage` para que al recargar la página sigamos donde quedamos.
 */

const STORAGE_KEY = 'cidr-vlsm:lastTab';

/** IDs de las dos pestañas soportadas. */
type TabId = 'cidr' | 'vlsm';

const VALID_TABS: readonly TabId[] = ['cidr', 'vlsm'] as const;

function isTabId(value: string | null): value is TabId {
  return value !== null && (VALID_TABS as readonly string[]).includes(value);
}

/**
 * Muestra la pestaña `id` y oculta las demás. Actualiza `aria-selected`
 * y la barra inferior (clase `.active`).
 */
function activate(id: TabId): void {
  // Botones.
  document.querySelectorAll<HTMLButtonElement>('[data-tab-trigger]').forEach((btn) => {
    const isActive = btn.dataset.tabTrigger === id;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', String(isActive));
  });
  // Paneles.
  document.querySelectorAll<HTMLElement>('[data-tab-panel]').forEach((panel) => {
    panel.classList.toggle('hidden', panel.dataset.tabPanel !== id);
  });
  // Persistencia.
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* localStorage puede estar deshabilitado en file://. No es crítico. */
  }
}

/**
 * Punto de entrada. Conecta listeners a los botones y restaura la última
 * pestaña conocida (o `cidr` por defecto).
 */
export function initTabs(): void {
  const triggers = document.querySelectorAll<HTMLButtonElement>(
    '[data-tab-trigger]',
  );
  if (triggers.length === 0) return;

  // Cada botón activa su panel al hacer click.
  triggers.forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.tabTrigger;
      if (isTabId(id)) activate(id);
    });
  });

  // Restaurar selección desde localStorage (con fallback a 'cidr').
  let initial: TabId = 'cidr';
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isTabId(saved)) initial = saved;
  } catch {
    // localStorage puede estar deshabilitado (file:// en某些 navegadores).
    // No es crítico: caemos al default.
  }
  activate(initial);
}
