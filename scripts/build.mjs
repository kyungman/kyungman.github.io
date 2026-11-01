import { readdir, readFile, mkdir, rm, writeFile, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import matter from 'gray-matter';
import MarkdownIt from 'markdown-it';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'dist');
const origin = 'https://kyungman.github.io';
const siteTitle = 'kyungman · 개발 기록';
const siteDescription = '개발하며 마주친 문제와 해결 과정을 기록합니다.';
const escape = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);
const markdown = new MarkdownIt({ html: false, linkify: false, typographer: false });
markdown.renderer.rules.table_open = () => '<div class="table-scroll" role="region" aria-label="표" tabindex="0"><table>\n';
markdown.renderer.rules.table_close = () => '</table></div>\n';
const dateFormat = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'long', timeZone: 'UTC' });

const posts = [];
for (const file of (await readdir(path.join(root, 'posts'))).filter((file) => file.endsWith('.md'))) {
  const { data, content } = matter(await readFile(path.join(root, 'posts', file), 'utf8'));
  for (const field of ['title', 'description', 'slug', 'date']) {
    if (typeof data[field] !== 'string' || !data[field].trim()) throw new Error(`${file}: ${field} 문자열이 필요합니다.`);
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug)) throw new Error(`${file}: slug는 영문 소문자, 숫자, 하이픈만 사용할 수 있습니다.`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date) || !Number.isFinite(Date.parse(data.date)) || new Date(data.date).toISOString().slice(0, 10) !== data.date) throw new Error(`${file}: 올바른 YYYY-MM-DD 날짜가 필요합니다.`);
  if (posts.some((post) => post.slug === data.slug)) throw new Error(`${file}: 중복된 slug입니다.`);
  if (data.tags !== undefined && (!Array.isArray(data.tags) || data.tags.some((tag) => typeof tag !== 'string'))) throw new Error(`${file}: tags는 문자열 목록이어야 합니다.`);
  posts.push({ ...data, tags: data.tags ?? [], url: `/posts/${data.slug}/`, html: markdown.render(content) });
}
posts.sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));

function layout({ title, description = siteDescription, url, body, noindex = false }) {
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escape(title)}</title>
  <meta name="description" content="${escape(description)}">
  <meta name="author" content="kyungman">
  <meta name="theme-color" content="#fafaf7">
  ${noindex ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${origin}${escape(url)}">`}
  <meta property="og:title" content="${escape(title)}">
  <meta property="og:description" content="${escape(description)}">
  <meta property="og:type" content="${url.startsWith('/posts/') ? 'article' : 'website'}">
  <meta property="og:url" content="${origin}${escape(url)}">
  <meta property="og:locale" content="ko_KR">
  <link rel="stylesheet" href="/assets/style.css">
</head>
<body>
  <a class="skip-link" href="#main">본문으로 바로 가기</a>
  <header class="site-header shell">
    <a class="brand" href="/">${siteTitle}</a>
    <nav aria-label="주 메뉴"><a href="/">글 목록</a><a href="https://github.com/kyungman" translate="no">GitHub ↗</a></nav>
  </header>
  <main id="main" class="shell" tabindex="-1">${body}</main>
  <footer class="site-footer shell"><p>${siteTitle}</p><a href="https://github.com/kyungman/kyungman.github.io">블로그 소스 ↗</a></footer>
</body>
</html>
`;
}
const dateLabel = (date) => `<time datetime="${date}">${dateFormat.format(new Date(`${date}T00:00:00Z`))}</time>`;
const tags = (post) => post.tags.map((tag) => `<span class="tag">${escape(tag)}</span>`).join('');
const index = layout({ title: siteTitle, url: '/', body: `
  <section class="intro" aria-labelledby="intro-title">
    <p class="eyebrow">DEVELOPMENT NOTES</p>
    <h1 id="intro-title">개발하며 배운 것들을<br>기록합니다.</h1>
    <p>마주친 문제와 해결 과정을 차근차근 남깁니다.</p>
  </section>
  <section class="post-list" aria-labelledby="posts-title">
    <div class="section-heading"><h2 id="posts-title">최근 글</h2><span>${posts.length}개의 기록</span></div>
    ${posts.length ? posts.map((post) => `<article class="post-card">
      <div class="post-meta">${dateLabel(post.date)}</div>
      <h3><a href="${post.url}">${escape(post.title)}</a></h3>
      <p>${escape(post.description)}</p>
      <div class="tags" aria-label="주제">${tags(post)}</div>
    </article>`).join('') : '<p>아직 작성된 글이 없습니다.</p>'}
  </section>` });

await rm(output, { recursive: true, force: true });
await mkdir(path.join(output, 'assets'), { recursive: true });
await writeFile(path.join(output, 'index.html'), index);
await copyFile(path.join(root, 'assets/style.css'), path.join(output, 'assets/style.css'));
for (const post of posts) {
  const destination = path.join(output, 'posts', post.slug);
  await mkdir(destination, { recursive: true });
  await writeFile(path.join(destination, 'index.html'), layout({ title: `${post.title} · ${siteTitle}`, description: post.description, url: post.url, body: `
    <article class="post">
      <a class="back-link" href="/">← 글 목록으로</a>
      <header class="post-header">
        <div class="post-meta">${dateLabel(post.date)}<span aria-hidden="true">·</span><span translate="no">kyungman</span></div>
        <h1>${escape(post.title)}</h1>
        <p class="post-description">${escape(post.description)}</p>
        <div class="tags" aria-label="주제">${tags(post)}</div>
      </header>
      <div class="prose">${post.html}</div>
      <div class="post-end"><a href="/">← 다른 개발 기록 보기</a></div>
    </article>` }));
}
await writeFile(path.join(output, '404.html'), layout({ title: `페이지를 찾을 수 없습니다 · ${siteTitle}`, url: '/404.html', noindex: true, body: '<section class="not-found"><p class="eyebrow">404</p><h1>페이지를 찾을 수 없습니다.</h1><p>주소를 확인하거나 글 목록에서 기록을 찾아보세요.</p><a href="/">글 목록으로 돌아가기 →</a></section>' }));
await writeFile(path.join(output, '.nojekyll'), '');
await writeFile(path.join(output, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`);
await writeFile(path.join(output, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${origin}/</loc></url>${posts.map((post) => `<url><loc>${origin}${post.url}</loc><lastmod>${post.date}</lastmod></url>`).join('')}</urlset>\n`);
console.log(`Built ${posts.length} post(s), home, 404 and static assets in dist/.`);
