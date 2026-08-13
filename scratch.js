import { MOCK_COMICS as mockComics } from './src/utils/mockComics.js';
const submissions = [];

const isSameChapterItem = (c, target) => {
    if (!c || !target) return false;
    if (c === target) return true;
    
    const cNum = Number(c.number !== undefined ? c.number : (c.chapterNumber !== undefined ? c.chapterNumber : NaN));
    const tNum = Number(target.number !== undefined ? target.number : (target.chapterNumber !== undefined ? target.chapterNumber : NaN));
    if (!isNaN(cNum) && !isNaN(tNum) && cNum > 0 && tNum > 0) {
      if (cNum !== tNum) return false;
    }
    
    if (c.id && target.id && c.id === target.id) return true;
    if (c.title && target.title && c.title.trim().toLowerCase() === target.title.trim().toLowerCase()) return true;
    return false;
};

// Generate submissions from mockComics the same way ModeratorDashboard does
mockComics.forEach((comic, idx) => {

  const rawChaps = comic.chaptersList || [];
  if (rawChaps.length > 0) {
    const sortedChaps = [...rawChaps].sort((a,b) => b.number - a.number);
    submissions.push({
      id: `mock-sub-${comic.id}`,
      comicId: comic.id,
      title: comic.title,
      status: 'pending',
      allChapters: sortedChaps.map(c => ({...c, submissionId: `mock-sub-${comic.id}`}))
    });
  }
});

const sub = submissions.find(s => s.title === 'Battle Chronicles');
console.log("Sub allChapters:", sub.allChapters.map(c => ({ id: c.id, title: c.title, number: c.number })));

const targetObj = sub.allChapters[0];
const remaining = sub.allChapters.filter(c => !isSameChapterItem(c, targetObj));
console.log("Remaining after rejecting Chapter 2:", remaining.map(c => ({ id: c.id, title: c.title, number: c.number })));
