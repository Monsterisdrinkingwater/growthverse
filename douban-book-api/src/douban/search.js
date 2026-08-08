const got = require('got');
const headers = require('./libs/getHeaders')();
const mobileHeaders = {
  ...headers,
  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
};

// 桌面版：解析 window.__DATA__ JSON
async function searchDesktop(text) {
  const response = await got('https://book.douban.com/subject_search?search_text=' + encodeURIComponent(text) + '&cat=1001', {
    method: 'GET',
    headers,
  });

  // Try to extract window.__DATA__ as plain JSON
  const dataMatch = /window\.__DATA__\s*=\s*(\{[\s\S]*?\});/.exec(response.body);
  if (dataMatch) {
    try {
      const data = JSON.parse(dataMatch[1]);
      if (data.items && Array.isArray(data.items)) {
        return data.items
          .filter(item => item.tpl_name === 'search_subject')
          .map(item => ({
            title: item.title || '',
            id: String(item.id || ''),
            url: item.url || '',
            cover: item.cover_url || '',
            rating: item.rating ? String(item.rating.value || '') : '',
            rating_count: item.rating ? item.rating.count : 0,
            info: item.abstract || '',
          }));
      }
    } catch (e) {
      console.error('Failed to parse __DATA__ JSON:', e.message);
    }
  }

  return [];
}

// 移动版：解析 subject-title / subject-link 结构
// 豆瓣桌面版搜索接口常触发"搜索访问太频繁"风控，移动版更宽松
async function searchMobile(text) {
  const response = await got('https://m.douban.com/search/?query=' + encodeURIComponent(text), {
    method: 'GET',
    headers: mobileHeaders,
  });

  const html = response.body;
  const parts = html.split('<span class="subject-title">');
  const results = [];

  for (const part of parts.slice(1)) {
    const title = part.split('<')[0].trim();
    if (!title) continue;

    // 只保留书籍条目（/book/subject/ 链接）
    const hrefMatch = /href="([^"]*)"/.exec(part);
    const href = hrefMatch ? hrefMatch[1] : '';
    const idMatch = /\/book\/subject\/(\d+)\//.exec(href);
    if (!idMatch) continue;

    const ratingMatch = /data-rating="([^"]+)"/.exec(part);
    const abstractMatch = /<p class="subject-abstract">([^<]*)</.exec(part);
    const coverMatch = /<img[^>]+src="([^"]*)"/.exec(part);

    results.push({
      title,
      id: idMatch[1],
      url: 'https://book.douban.com/subject/' + idMatch[1] + '/',
      cover: coverMatch ? coverMatch[1] : '',
      rating: ratingMatch ? ratingMatch[1] : '',
      rating_count: 0,
      info: abstractMatch ? abstractMatch[1].trim() : '',
    });
  }

  return results;
}

async function getSearchResultFromOnline(text) {
  // 1. 优先桌面版（数据更完整：封面、评分人数）
  const desktop = await searchDesktop(text);
  if (desktop.length > 0) {
    return desktop;
  }

  // 2. 桌面版被风控/无结果时，降级移动版
  const mobile = await searchMobile(text);
  if (mobile.length > 0) {
    console.log(`[douban] desktop blocked, used mobile fallback (${mobile.length} results)`);
    return mobile;
  }

  return [];
}

module.exports = {
  getSearchResultFromOnline
};
