const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://emovies.elproject.studio';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function generateSitemap() {
  console.log('Generating sitemap for:', baseUrl);
  const pages = [
    { loc: `${baseUrl}/`, priority: '1.0', changefreq: 'daily' },
    { loc: `${baseUrl}/?view=featured`, priority: '0.9', changefreq: 'daily' },
    { loc: `${baseUrl}/?view=trending`, priority: '0.9', changefreq: 'daily' },
    { loc: `${baseUrl}/?view=popular`, priority: '0.9', changefreq: 'daily' },
    { loc: `${baseUrl}/?type=movie`, priority: '0.8', changefreq: 'daily' },
    { loc: `${baseUrl}/?type=tv`, priority: '0.8', changefreq: 'daily' },
  ];

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data: videos, error } = await supabase
        .from('videos')
        .select('id, updated_at, created_at')
        .limit(1000);

      if (!error && videos && videos.length > 0) {
        console.log(`Adding ${videos.length} movie URLs to sitemap...`);
        videos.forEach(v => {
          const lastMod = v.updated_at || v.created_at || new Date().toISOString();
          pages.push({
            loc: `${baseUrl}/movie/watch?id=${v.id}`,
            lastmod: lastMod.split('T')[0],
            priority: '0.7',
            changefreq: 'weekly',
          });
        });
      }
    } catch (e) {
      console.warn('Failed to fetch movies from Supabase for sitemap:', e.message);
    }
  }

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .map(
    p => `  <url>
    <loc>${p.loc}</loc>
    ${p.lastmod ? `<lastmod>${p.lastmod}</lastmod>` : `<lastmod>${new Date().toISOString().split('T')[0]}</lastmod>`}
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

  const outPath = path.join(__dirname, '..', 'public', 'sitemap.xml');
  fs.writeFileSync(outPath, sitemapXml, 'utf-8');
  console.log(`Sitemap written successfully to ${outPath} with ${pages.length} URLs!`);
}

generateSitemap();
