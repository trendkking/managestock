import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const out = path.join(__dirname, '../frontend/public/sitemap.xml')
const siteUrl = 'https://bullslong.com'
const lastmod = new Date().toISOString().slice(0, 10)

const entries = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/register', changefreq: 'monthly', priority: '0.8' },
  { path: '/login', changefreq: 'monthly', priority: '0.5' },
]

const urls = entries
  .map(
    (e) => `  <url>
    <loc>${siteUrl}${e.path === '/' ? '/' : e.path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority}</priority>
  </url>`,
  )
  .join('\n')

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`

fs.writeFileSync(out, xml, 'utf8')
console.log(`sitemap.xml updated (${lastmod})`)
