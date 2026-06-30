import comicAction from '../assets/comic_action.png'
import comicAdventure from '../assets/comic_adventure.png'
import comicScifi from '../assets/comic_scifi.png'

export const MOCK_COMICS = [
  {
    id: '1',
    title: 'Battle Chronicles',
    cover: comicAction,
    genres: ['Action', 'Fantasy', 'Adventure'],
    author: 'Ji-Woo Park',
    artist: 'Studio ComiVerse',
    chaptersCount: 184,
    chapters: 184,
    views: '1.2M',
    bookmarks: '45.2K',
    rating: '4.9',
    status: 'Ongoing',
    tagline: 'An epic fantasy action-adventure following the legacy of the legendary warrior who shattered the heavens. Forces of darkness emerge, and a young apprentice must unlock the ancient power within.'
  },
  {
    id: '2',
    title: 'Dragon Legacy',
    cover: comicAdventure,
    genres: ['Adventure', 'Fantasy'],
    author: 'Sarah Jenkins',
    artist: 'Team Dragon',
    chaptersCount: 372,
    chapters: 372,
    views: '2.4M',
    bookmarks: '98.7K',
    rating: '4.8',
    status: 'Ongoing',
    tagline: 'The last dragon rider rises to save the kingdom from ancient ashes. Together with a young dragon hatchling, they must journey to the Edge of the World.'
  },
  {
    id: '3',
    title: 'Neon Genesis',
    cover: comicScifi,
    genres: ['Sci-Fi', 'Action'],
    author: 'Kenji Sato',
    artist: 'NeoArt Studio',
    chaptersCount: 95,
    chapters: 95,
    views: '850K',
    bookmarks: '31.4K',
    rating: '4.7',
    status: 'Completed',
    tagline: 'In a dystopian cyberpunk future, a rogue hacker discovers a secret AI that could either save humanity or wipe it out entirely. The neon streets are paved with danger.'
  },
  {
    id: '4',
    title: 'Infinite Journey',
    cover: comicAdventure,
    genres: ['Adventure', 'Fantasy'],
    author: 'Marcus Aurelius',
    artist: 'Infinity Labs',
    chaptersCount: 120,
    chapters: 120,
    views: '1.1M',
    bookmarks: '38.5K',
    rating: '4.8',
    status: 'Ongoing',
    tagline: 'An endless quest through dimensions to discover the ultimate truth of magic and science.'
  },
  {
    id: '5',
    title: 'Solo Adventure',
    cover: comicAction,
    genres: ['Action', 'Fantasy'],
    author: 'Kim Min-Jae',
    artist: 'Solo Studio',
    chaptersCount: 45,
    chapters: 45,
    views: '400K',
    bookmarks: '18.9K',
    rating: '4.6',
    status: 'Ongoing',
    tagline: 'Conquering dungeons alone to protect what matters most. In a world of guilds, one hunter goes solo.'
  },
  {
    id: '6',
    title: 'Cyber Odyssey',
    cover: comicScifi,
    genres: ['Sci-Fi', 'Action'],
    author: 'Elena Rostova',
    artist: 'CyberArt',
    chaptersCount: 62,
    chapters: 62,
    views: '320K',
    bookmarks: '12.4K',
    rating: '4.5',
    status: 'Ongoing',
    tagline: 'A journey into the deep web to retrieve a stolen digital soul. In the virtual world, death is permanent.'
  }
]
