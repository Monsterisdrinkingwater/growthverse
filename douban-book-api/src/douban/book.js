const got = require('got');
const headers = require('./libs/getHeaders')();
const parseHTML = require('./libs/parseHtml');

async function getBookInfoFromOnlineById(id) {
  try {
    const response = await got(`https://book.douban.com/subject/${id}/`, {
      method: 'GET',
      headers,
    });
    return parseHTML(response.body, id);
  } catch (err) {
    console.error(`Error fetching book ${id}:`, err.message, err.response?.statusCode);
    throw err;
  }
}

async function getBookInfoFromOnlineByIsbn(isbn) {
  try {
    const response = await got(`https://book.douban.com/isbn/${isbn}/`, {
      method: 'GET',
      headers,
    });
    return parseHTML(response.body);
  } catch (err) {
    console.error(`Error fetching isbn ${isbn}:`, err.message, err.response?.statusCode);
    throw err;
  }
}

module.exports = {
  getBookInfoFromOnlineById,
  getBookInfoFromOnlineByIsbn,
};