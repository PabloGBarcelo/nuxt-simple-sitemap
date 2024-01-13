import { hasProtocol } from 'ufo'
import { fixSlashes } from 'site-config-stack/urls'
import type {
  AlternativeEntry,
  NitroUrlResolvers,
  ResolvedSitemapUrl,
  SitemapUrl,
  SitemapUrlInput,
} from '../../../types'
import { mergeOnKey } from '../../../utils-pure'

function resolve(s: string | URL, resolvers: NitroUrlResolvers): string
function resolve(s: string | undefined | URL, resolvers: NitroUrlResolvers): string | undefined {
  if (typeof s === 'undefined')
    return s
  // convert url to string
  s = typeof s === 'string' ? s : s.toString()
  // avoid transforming remote urls and urls already resolved
  if (hasProtocol(s, { acceptRelative: true, strict: false }))
    return resolvers.fixSlashes(s)

  return resolvers.canonicalUrlResolver(s)
}

export function normaliseSitemapUrls(data: SitemapUrlInput[], resolvers: NitroUrlResolvers): ResolvedSitemapUrl[] {
  // make sure we're working with objects
  const entries: SitemapUrl[] = data
    .map(e => typeof e === 'string' ? { loc: e } : e)
    // uniform loc
    .map((e) => {
      // make fields writable so we can modify them
      e = { ...e }
      if (e.url) {
        e.loc = e.url
        delete e.url
      }
      // we want a uniform loc so we can dedupe using it, remove slashes and only get the path
      e.loc = fixSlashes(false, e.loc)
      return e
    })
    .filter(Boolean)

  // apply auto alternative lang prefixes, needs to happen before normalization

  function normaliseEntry(e: SitemapUrl): ResolvedSitemapUrl {
    if (e.lastmod) {
      const date = normaliseDate(e.lastmod)
      if (date)
        e.lastmod = date
      else
        delete e.lastmod
    }
    // make sure it's valid
    if (!e.lastmod)
      delete e.lastmod

    // need to make sure siteURL doesn't have the base on the end
    e.loc = resolve(e.loc, resolvers)

    // correct alternative hrefs
    if (e.alternatives) {
      e.alternatives = mergeOnKey(e.alternatives.map((e) => {
        const a: AlternativeEntry & { key?: string } = { ...e }
        // string
        if (typeof a.href === 'string')
          a.href = resolve(a.href, resolvers)
        // URL object
        else if (typeof a.href === 'object' && a.href)
          a.href = resolve(a.href.href, resolvers)
        return a
      }), 'hreflang')
    }

    if (e.images) {
      e.images = mergeOnKey(e.images.map((i) => {
        i = { ...i }
        i.loc = resolve(i.loc, resolvers)
        return i
      }), 'loc')
    }

    if (e.videos) {
      e.videos = e.videos.map((v) => {
        v = { ...v }
        if (v.content_loc)
          v.content_loc = resolve(v.content_loc, resolvers)
        return v
      })
    }

    // @todo normalise image href and src
    return e as ResolvedSitemapUrl
  }
  return mergeOnKey(
    entries.map(normaliseEntry)
      .map(e => ({ ...e, _key: `${e._sitemap || ''}${e.loc}` })),
    '_key',
  )
}

export function normaliseDate(date: string | Date): string
export function normaliseDate(d: Date | string) {
  // lastmod must adhere to W3C Datetime encoding rules
  if (typeof d === 'string') {
    // we may have milliseconds at the end with a dot prefix like ".963745", we should remove this
    d = d.replace('Z', '')
    d = d.replace(/\.\d+$/, '')
    // we may have a value like this "2023-12-21T13:49:27", this needs to be converted to w3c datetime
    // accept if they are already in the right format, accept small format too such as "2023-12-21"
    const validW3CDate = /(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))/
    if (d.match(validW3CDate) || d.match(/^\d{4}-\d{2}-\d{2}$/))
      return d

    // otherwise we need to parse it
    d = new Date(d)
    // check for invalid date
    if (Number.isNaN(d.getTime()))
      return false
  }
  const z = (n: number) => (`0${n}`).slice(-2)
  return (
    `${d.getUTCFullYear()
    }-${
      z(d.getUTCMonth() + 1)
    }-${
      z(d.getUTCDate())
    }T${
      z(d.getUTCHours())
    }:${
      z(d.getUTCMinutes())
    }:${
      z(d.getUTCSeconds())
    }+00:00`
  )
}
