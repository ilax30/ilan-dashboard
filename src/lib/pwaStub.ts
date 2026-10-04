// Vervanger voor 'virtual:pwa-register' in de losse HTML-build (zonder service worker).
export function registerSW(_options?: unknown) {
  return async (_reload?: boolean) => {}
}
