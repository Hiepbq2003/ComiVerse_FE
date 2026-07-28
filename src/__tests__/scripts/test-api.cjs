const http = require('http');

http.get('http://localhost:8081/api/comics/explore?page=1&size=50', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      const comics = parsed.data.items || parsed.data.content || parsed.data || [];
      const comic = comics.find(c => c.title === 'Tạm biệt Long tóc đỏ');
      console.log('Explore API:', comic ? { title: comic.title, chapterCount: comic.chapterCount } : 'Not found');
    } catch(e) {
      console.error('Failed to parse:', e.message);
    }
  });
}).on('error', err => console.error('Request failed:', err.message));
