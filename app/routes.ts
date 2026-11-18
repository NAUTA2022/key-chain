import { type RouteConfig, index, layout, route } from '@react-router/dev/routes';

export default [
  // Landing: no wallet code on the critical path.
  layout('layouts/keychain.tsx', { id: 'keychain-public' }, [
    index('routes/home.tsx'),
  ]),

  // Everything that can use a wallet shares one thirdweb provider.
  layout('layouts/wallet.tsx', [
    layout('layouts/keychain.tsx', [
      route('ingresar', 'routes/login.tsx'),
      layout('layouts/shell.tsx', [
        // Public, indexable pages
        route('tokenizaciones', 'routes/tokenizaciones.tsx'),
        route('tokenizaciones/:assetId', 'routes/tokenizacion.tsx'),
        route('mercado-secundario', 'routes/mercado-secundario.tsx'),
        // Switched-off sections stay mapped but redirect (app/lib/hiddenSections.ts).
        layout('layouts/section-gate.tsx', { id: 'section-gate-shell' }, [
          route('token', 'routes/token.tsx'),
          route('ecosistema', 'routes/ecosistema.tsx'),
          route('feed', 'routes/feed.tsx'),
        ]),
        route('academia', 'routes/academia.tsx'),
        route('academia/:slug', 'routes/articulo.tsx'),
        route('ayuda', 'routes/ayuda.tsx'),
        route('terminos', 'routes/terminos.tsx'),
        route('privacidad', 'routes/privacidad.tsx'),
        // Private pages (connected wallet required)
        layout('layouts/require-wallet.tsx', [
          route('empresas/:slug', 'routes/empresa.tsx'),
          route('usuarios/:slug', 'routes/usuario.tsx'),
          route('panel', 'routes/panel.tsx'),
          route('checkout', 'routes/checkout.tsx'),
          route('pertenencias', 'routes/pertenencias.tsx'),
          route('demo-en-vivo', 'routes/demo-en-vivo.tsx'),
          route('inquilino', 'routes/inquilino.tsx'),
          route('perfil', 'routes/perfil.tsx'),
          route('tokenizar', 'routes/tokenizar.tsx'),
          route('swap', 'routes/swap.tsx'),
          layout('layouts/require-admin.tsx', [
            route('admin', 'routes/admin.tsx'),
            route('configuracion', 'routes/configuracion.tsx'),
          ]),
        ]),
      ]),
    ]),

    // Standalone products (own chrome and theme)
    route('keypay/*', 'routes/keypay.tsx'),
    layout('layouts/section-gate.tsx', { id: 'section-gate-products' }, [
      route('bookey/*', 'routes/bookey.tsx'),
      // Products not yet public: admin-only preview, never prerendered or indexed.
      layout('layouts/require-admin.tsx', { id: 'admin-preview-products' }, [
        route('key-drive/*', 'routes/key-drive.tsx'),
        route('key-jobs/*', 'routes/key-jobs.tsx'),
        route('key-rural/*', 'routes/key-rural.tsx'),
        route('escrow-chain/*', 'routes/escrow-chain.tsx'),
        route('tracker-gps/*', 'routes/tracker-gps.tsx'),
      ]),
    ]),
  ]),

  // Crawler / AI discovery resources (prerendered at build time)
  route('robots.txt', 'routes/robots[.]txt.ts'),
  route('sitemap.xml', 'routes/sitemap[.]xml.ts'),
  route('llms.txt', 'routes/llms[.]txt.ts'),

  route('*', 'routes/not-found.tsx'),
] satisfies RouteConfig;
