const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:VCtvhCjSrtirwBdyYPjBmyizrYGbgiSz@tokaido.proxy.rlwy.net:32484/railway',
});

client.connect()
  .then(() => client.query("SELECT id, title, chapter_count, deleted, moderation_status FROM comics WHERE title = 'Tạm biệt Long tóc đỏ'"))
  .then(res => {
    console.log(res.rows);
    client.end();
  })
  .catch(err => {
    console.error(err);
    client.end();
  });
