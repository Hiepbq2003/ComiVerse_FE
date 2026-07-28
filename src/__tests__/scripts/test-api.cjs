fetch('http://localhost:8081/api/comics/explore?page=1&size=50')
  .then(res => res.json())
  .then(parsed => {
    const comics = parsed.data.items || parsed.data.content || parsed.data || [];
    const comic = comics.find(c => c.title === 'AYASHII IYASHI NO YAKUMO-SAN');
    console.log('Explore API:', comic ? { title: comic.title, ratingAverage: comic.ratingAverage, ratingCount: comic.ratingCount } : 'Not found');
    process.exit(0);
  })
  .catch(err => {
    console.error('Request failed:', err.message);
    process.exit(1);
  });
