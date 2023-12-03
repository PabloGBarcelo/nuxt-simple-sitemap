import { resolve } from 'node:path'
import { defineNuxtConfig } from 'nuxt/config'
import { defineNuxtModule } from '@nuxt/kit'
import { startSubprocess } from '@nuxt/devtools-kit'
import NuxtSimpleSitemap from '../src/module'
import i18nPages from './i18n.pages'
import i18nLocales from './i18n.locales'

export default defineNuxtConfig({
  modules: [
    NuxtSimpleSitemap,
    'nuxt-simple-robots',
    '@nuxtjs/i18n',
    '@nuxt/content',
    '@nuxt/ui',
    'nuxt-icon',
    /**
     * Start a sub Nuxt Server for developing the client
     *
     * The terminal output can be found in the Terminals tab of the devtools.
     */
    defineNuxtModule({
      setup(_, nuxt) {
        if (!nuxt.options.dev)
          return

        const subprocess = startSubprocess(
          {
            command: 'npx',
            args: ['nuxi', 'dev', '--port', '3030'],
            cwd: resolve(__dirname, '../client'),
          },
          {
            id: 'nuxt-simple-sitemap:client',
            name: 'Nuxt Simple Sitemap Client Dev',
          },
        )
        subprocess.getProcess().stdout?.on('data', (data) => {
          // eslint-disable-next-line no-console
          console.log(` sub: ${data.toString()}`)
        })

        process.on('exit', () => {
          subprocess.terminate()
        })

        // process.getProcess().stdout?.pipe(process.stdout)
        // process.getProcess().stderr?.pipe(process.stderr)
      },
    }),
  ],
  ignorePrefix: 'ignore-',
  i18n: {
    defaultLocale: 'en',
    pages: i18nPages,
    baseUrl: "https://www.nuxtseo.com",
    langDir: "locales",
    locales: i18nLocales,
  },
  nitro: {
    plugins: ['plugins/sitemap.ts'],
    prerender: {
      routes: [
        '/sitemap_index.xml',
        '/should-be-in-sitemap',
        '/foo.bar/',
        '/test.doc',
      ],
      failOnError: false,
    },
  },
  content: {
    documentDriven: true,
  },
  site: {
    url: 'https://nuxtseo.com',
  },

  // app: {
  //   baseURL: '/base'
  // },

  robots: {
    indexable: true,
  },
  sitemap: {
    debug: true,
    // sitemapName: 'test.xml',
    // dynamicUrlsApiEndpoint: '/__sitemap',
    xslColumns: [
      { label: 'URL', width: '50%' },
      { label: 'Last Modified', select: 'sitemap:lastmod', width: '25%' },
      { label: 'Hreflangs', select: 'count(xhtml:link)', width: '25%' },
    ],
    urls: [
      '/manual-url-test',
    ],
    sources: [
      '/some-invalid-url',
      ['https://api.example.com/pages/urls', { headers: { Authorization: 'Bearer <token>' } }],
    ],
    defaultSitemapsChunkSize: 10,
  },
  routeRules: {
    '/secret': {
      index: false,
    },
    '/users-test/*': {
      sitemap: {
        lastmod: new Date(2023, 1, 21, 4, 50, 52),
        changefreq: 'weekly',
        priority: 0.3,
        images: [],
      },
    },
    '/should-not-be-in-sitemap/*': {},
    '/about-redirect': {
      redirect: '/about',
    },
    '/about': {
      sitemap: {
        lastmod: new Date(2023, 1, 21, 8, 50, 52),
        changefreq: 'daily',
        priority: 0.3,
        images: [
          {
            loc: 'https://example.com/image.jpg',
          },
          {
            loc: 'https://example.com/image2.jpg',
          },
        ],
      },
    },
  },
  experimental: {
    inlineRouteRules: true,
  },
})
