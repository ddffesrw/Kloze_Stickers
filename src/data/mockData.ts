// Mock data for Kloze Stickers app

export interface StickerPack {
  id: string;
  name: string;
  creator: string;
  creatorAvatar: string;
  coverImage: string;
  stickers: string[];
  downloads: number;
  isFavorite: boolean;
  category: string;
  isPremium: boolean;
}

export interface Category {
  id: string;
  name: string;
  emoji: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  credits: number;
  isPro: boolean;
  joinedAt: string;
}

export const categories: Category[] = [
  { id: "1", name: "Eğlence", emoji: "😂" },
  { id: "2", name: "Hayvanlar", emoji: "🐱" },
  { id: "3", name: "Aşk", emoji: "❤️" },
  { id: "4", name: "Gaming", emoji: "🎮" },
  { id: "5", name: "Anime", emoji: "✨" },
  { id: "6", name: "Meme", emoji: "🤣" },
  { id: "7", name: "Müzik", emoji: "🎵" },
  { id: "8", name: "Spor", emoji: "⚽" },
];

export const trendingPacks: StickerPack[] = [
  {
    id: "1",
    name: "Viral Memes 2024",
    creator: "MemeKing",
    creatorAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=memeking",
    coverImage: "https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?w=400&h=400&fit=crop",
    stickers: Array(12).fill("").map((_, i) => `https://api.dicebear.com/7.x/fun-emoji/svg?seed=meme${i}`),
    downloads: 15420,
    isFavorite: false,
    category: "Eğlence",
    isPremium: false,
  },
  {
    id: "2",
    name: "Kawaii Cats",
    creator: "CatLover",
    creatorAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=catlover",
    coverImage: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&h=400&fit=crop",
    stickers: Array(12).fill("").map((_, i) => `https://api.dicebear.com/7.x/fun-emoji/svg?seed=cat${i}`),
    downloads: 12350,
    isFavorite: true,
    category: "Hayvanlar",
    isPremium: false,
  },
  {
    id: "3",
    name: "Love & Hearts",
    creator: "RomanticArt",
    creatorAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=romantic",
    coverImage: "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=400&h=400&fit=crop",
    stickers: Array(12).fill("").map((_, i) => `https://api.dicebear.com/7.x/fun-emoji/svg?seed=love${i}`),
    downloads: 9870,
    isFavorite: false,
    category: "Aşk",
    isPremium: true,
  },
  {
    id: "4",
    name: "Anime Reactions",
    creator: "OtakuMaster",
    creatorAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=otaku",
    coverImage: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&h=400&fit=crop",
    stickers: Array(12).fill("").map((_, i) => `https://api.dicebear.com/7.x/fun-emoji/svg?seed=anime${i}`),
    downloads: 18900,
    isFavorite: true,
    category: "Anime",
    isPremium: false,
  },
];

export const allPacks: StickerPack[] = [
  ...trendingPacks,
  {
    id: "5",
    name: "Gamer Moments",
    creator: "ProGamer",
    creatorAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=gamer",
    coverImage: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=400&h=400&fit=crop",
    stickers: Array(12).fill("").map((_, i) => `https://api.dicebear.com/7.x/fun-emoji/svg?seed=game${i}`),
    downloads: 7650,
    isFavorite: false,
    category: "Gaming",
    isPremium: false,
  },
  {
    id: "6",
    name: "Daily Moods",
    creator: "MoodMaker",
    creatorAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=mood",
    coverImage: "https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=400&h=400&fit=crop",
    stickers: Array(12).fill("").map((_, i) => `https://api.dicebear.com/7.x/fun-emoji/svg?seed=mood${i}`),
    downloads: 5430,
    isFavorite: false,
    category: "Eğlence",
    isPremium: false,
  },
  {
    id: "7",
    name: "Premium Gold Pack",
    creator: "KlozeOfficial",
    creatorAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=kloze",
    coverImage: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=400&fit=crop",
    stickers: Array(12).fill("").map((_, i) => `https://api.dicebear.com/7.x/fun-emoji/svg?seed=gold${i}`),
    downloads: 25000,
    isFavorite: true,
    category: "Anime",
    isPremium: true,
  },
  {
    id: "8",
    name: "Music Vibes",
    creator: "BeatMaster",
    creatorAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=beat",
    coverImage: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&h=400&fit=crop",
    stickers: Array(12).fill("").map((_, i) => `https://api.dicebear.com/7.x/fun-emoji/svg?seed=music${i}`),
    downloads: 4320,
    isFavorite: false,
    category: "Müzik",
    isPremium: false,
  },
];

export const mockUsers: User[] = [
  {
    id: "1",
    name: "Ahmet Yılmaz",
    email: "ahmet@example.com",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=ahmet",
    credits: 25,
    isPro: true,
    joinedAt: "2024-01-15",
  },
  {
    id: "2",
    name: "Elif Demir",
    email: "elif@example.com",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=elif",
    credits: 5,
    isPro: false,
    joinedAt: "2024-02-20",
  },
  {
    id: "3",
    name: "Mehmet Kaya",
    email: "mehmet@example.com",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=mehmet",
    credits: 100,
    isPro: true,
    joinedAt: "2023-11-10",
  },
  {
    id: "4",
    name: "Zeynep Öz",
    email: "zeynep@example.com",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=zeynep",
    credits: 12,
    isPro: false,
    joinedAt: "2024-03-05",
  },
];

export const currentUser: User = {
  id: "current",
  name: "Kullanıcı",
  email: "kullanici@example.com",
  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=user",
  credits: 12,
  isPro: false,
  joinedAt: "2024-01-01",
};

export const aiStyles = [
  { id: "3d", name: "3D", icon: "🎲" },
  { id: "anime", name: "Anime", icon: "🌸" },
  { id: "minimalist", name: "Minimalist", icon: "◯" },
  { id: "vector", name: "Vector", icon: "✏️" },
];

export const adminStats = {
  totalPacks: 156,
  activeUsers: 2450,
  revenue: 12500,
  newUsersToday: 45,
  generationsToday: 890,
};
