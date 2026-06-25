import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import {
  DEFAULT_OG_IMAGE,
  buildCanonical,
  resolveSeoMeta,
  type SeoMeta,
} from '@/lib/seo'

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  const selector = `meta[${attr}="${key}"]`
  let el = document.querySelector<HTMLMetaElement>(selector)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.content = content
}

function upsertCanonical(href: string) {
  let el = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.rel = 'canonical'
    document.head.appendChild(el)
  }
  el.href = href
}

function applySeo(meta: SeoMeta, pathname: string) {
  const canonical = buildCanonical(meta.canonicalPath ?? pathname)
  const robots = meta.noindex ? 'noindex, nofollow' : 'index, follow'
  const keywords = meta.keywords ?? ''

  document.title = meta.title
  upsertMeta('name', 'title', meta.title)
  upsertMeta('name', 'description', meta.description)
  if (keywords) upsertMeta('name', 'keywords', keywords)
  upsertMeta('name', 'robots', robots)

  upsertMeta('property', 'og:type', 'website')
  upsertMeta('property', 'og:title', meta.title)
  upsertMeta('property', 'og:description', meta.description)
  upsertMeta('property', 'og:url', canonical)
  upsertMeta('property', 'og:image', DEFAULT_OG_IMAGE)

  upsertMeta('name', 'twitter:card', 'summary_large_image')
  upsertMeta('name', 'twitter:title', meta.title)
  upsertMeta('name', 'twitter:description', meta.description)
  upsertMeta('name', 'twitter:image', DEFAULT_OG_IMAGE)
  upsertMeta('name', 'twitter:url', canonical)

  upsertCanonical(canonical)
}

/** 라우트 변경 시 document head 메타태그 동기화 */
export function RouteSeo() {
  const { pathname } = useLocation()

  useEffect(() => {
    applySeo(resolveSeoMeta(pathname), pathname)
  }, [pathname])

  return null
}

/** 페이지별 커스텀 메타 (선택) */
export function PageSeo(props: SeoMeta & { path?: string }) {
  const { pathname } = useLocation()

  useEffect(() => {
    applySeo(props, props.path ?? pathname)
  }, [props, pathname])

  return null
}
