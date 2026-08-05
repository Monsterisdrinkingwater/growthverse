const got = require('got');
const headers = require('./libs/getHeaders')();

async function getSearchResultFromOnline(text) {
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

module.exports = {
  getSearchResultFromOnline
};
