const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:VCtvhCjSrtirwBdyYPjBmyizrYGbgiSz@tokaido.proxy.rlwy.net:32484/railway',
});

client.connect()
  .then(() => client.query("SELECT id, title, chapter_count, rating_average, rating_count FROM comics WHERE title = 'AYASHII IYASHI NO YAKUMO-SAN'"))
  .then(res => {
    console.log(res.rows);
    client.end();
  })
  .catch(err => {
    console.error(err);
    client.end();
  });
