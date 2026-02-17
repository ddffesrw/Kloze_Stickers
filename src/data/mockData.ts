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
  { id: "9", name: "Sanat", emoji: "🎨" },
  { id: "10", name: "Psychedelic", emoji: "🍄" },
  { id: "11", name: "Animated", emoji: "🎬" },
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

// Flux Schnell optimized: short, strong style tokens - subject stays dominant
export const aiStyles = [
  { id: "3d", name: "3D Render", icon: "🎲", description: "Gerçekçi 3D görünüm", prompt: "3D rendered, isometric, glossy, soft lighting" },
  { id: "anime", name: "Anime", icon: "🌸", description: "Japon çizgi film tarzı", prompt: "anime style, cel shaded, vibrant colors" },
  { id: "minimalist", name: "Minimalist", icon: "◯", description: "Sade ve şık", prompt: "minimalist, clean lines, flat design" },
  { id: "vector", name: "Vector", icon: "✏️", description: "Düz renkli illüstrasyon", prompt: "vector art, flat colors, bold outlines" },
  { id: "kawaii", name: "Kawaii", icon: "🧸", description: "Sevimli Japon stili", prompt: "kawaii, cute, pastel colors, chibi" },
  { id: "pixel", name: "Pixel Art", icon: "🕹️", description: "Retro oyun grafikleri", prompt: "pixel art, 8-bit sprite" },
  { id: "watercolor", name: "Sulu Boya", icon: "🎨", description: "Sanatsal ve yumuşak", prompt: "watercolor painting, soft edges, pastel tones" },
  { id: "neon", name: "Neon", icon: "💡", description: "Parlak cyberpunk", prompt: "neon glow, vibrant colors, synthwave" },
  { id: "cartoon", name: "Cartoon", icon: "🎬", description: "Çizgi film karakteri", prompt: "cartoon style, bold outlines, expressive" },
  { id: "sketch", name: "Sketch", icon: "✍️", description: "El çizimi görünümü", prompt: "pencil sketch, hand drawn, graphite" },
  { id: "tribal", name: "Tribal", icon: "🗿", description: "Etnik desenler", prompt: "tribal art, ethnic patterns, monochrome" },
  { id: "illusion", name: "Illusion", icon: "👁️", description: "Optik illüzyon", prompt: "optical illusion, geometric patterns, surreal" },
  { id: "psychedelic", name: "Psychedelic", icon: "🍄", description: "Renkli halüsinasyon", prompt: "psychedelic, colorful swirls, trippy" },
  { id: "pop-art", name: "Pop Art", icon: "🖼️", description: "Renkli ve cesur", prompt: "pop art, halftone dots, bold colors" },
  { id: "chibi", name: "Chibi", icon: "🎀", description: "Minik sevimli karakter", prompt: "chibi style, big head, small body, cute" },
  { id: "vaporwave", name: "Vaporwave", icon: "🌴", description: "Retro estetik", prompt: "vaporwave, retro 80s, pink purple gradient" },
  { id: "steampunk", name: "Steampunk", icon: "⚙️", description: "Viktorya mekanik", prompt: "steampunk, gears, brass, victorian mechanical" },
  { id: "cyberpunk", name: "Cyberpunk", icon: "🤖", description: "Fütüristik şehir", prompt: "cyberpunk, futuristic, neon, high tech" },
  { id: "origami", name: "Origami", icon: "🦢", description: "Kağıt katlama sanatı", prompt: "origami style, paper folding, geometric" },
  { id: "stained-glass", name: "Vitray", icon: "🪟", description: "Cam mozaik", prompt: "stained glass style, colorful glass panels, black outlines" },
  { id: "graffiti", name: "Graffiti", icon: "🎤", description: "Sokak sanatı", prompt: "graffiti art, spray paint, urban style" },
  { id: "clay", name: "Clay 3D", icon: "🏺", description: "Kil heykel", prompt: "clay sculpture, plasticine, soft rounded, claymation" },
  { id: "lowpoly", name: "Low Poly", icon: "💎", description: "Geometrik 3D", prompt: "low poly 3D, geometric polygons, faceted" },
  { id: "emoji", name: "Emoji", icon: "😊", description: "Emoji tarzı", prompt: "emoji style, simple expressive face, round" },
];

export const adminStats = {
  totalPacks: 156,
  activeUsers: 2450,
  revenue: 12500,
  newUsersToday: 45,
  generationsToday: 890,
};

/**
 * Prompt Modifiers - SDXL & Pony Optimized Technical Keywords
 * Each modifier adds professional quality enhancers to the prompt
 */
export const promptModifiers: Record<string, { label: string; icon: string; keywords: string }> = {
  ultraDetail: {
    label: "Ultra Detay",
    icon: "🔬",
    keywords: "ultra detailed, intricate details, highly detailed, 8k uhd, sharp focus"
  },
  cinematic: {
    label: "Sinematik",
    icon: "🎬",
    keywords: "cinematic lighting, dramatic lighting, volumetric lighting, film grain, movie scene"
  },
  masterpiece: {
    label: "Başyapıt",
    icon: "🏆",
    keywords: "masterpiece, best quality, award winning, professional, trending on artstation"
  },
  vibrant: {
    label: "Canlı Renkler",
    icon: "🌈",
    keywords: "vibrant colors, vivid, saturated, colorful, rich colors, dynamic range"
  },
  softLight: {
    label: "Yumuşak Işık",
    icon: "🌤️",
    keywords: "soft lighting, ambient light, diffused light, gentle shadows, natural lighting"
  },
  sharpFocus: {
    label: "Net Odak",
    icon: "🎯",
    keywords: "sharp focus, in focus, crisp, clear, high resolution, defined edges"
  },
  composition: {
    label: "Kompozisyon",
    icon: "📐",
    keywords: "perfect composition, rule of thirds, balanced, well framed, centered subject"
  },
  texture: {
    label: "Doku",
    icon: "🧱",
    keywords: "detailed texture, realistic texture, tactile, surface detail, material definition"
  },
  smooth: {
    label: "Pürüzsüz",
    icon: "✨",
    keywords: "smooth, polished, clean render, no noise, flawless, pristine"
  },
  depth: {
    label: "Derinlik",
    icon: "🌊",
    keywords: "depth of field, bokeh, 3d depth, layered, dimensional, perspective"
  }
};

/**
 * Generates the final prompt by combining user input with selected modifiers
 * Does NOT include style - that's handled separately
 * 
 * @param userPrompt - The base prompt written by the user
 * @param selectedModifiers - Array of modifier keys to apply (e.g., ["ultraDetail", "cinematic"])
 * @returns Combined prompt string
 */
export function generateFinalPrompt(
  userPrompt: string,
  selectedModifiers: string[]
): string {
  if (!userPrompt.trim()) return "";

  // Collect keywords from selected modifiers
  const modifierKeywords = selectedModifiers
    .filter(key => promptModifiers[key])
    .map(key => promptModifiers[key].keywords)
    .join(", ");

  // Combine: User Prompt + Modifier Keywords
  // Style is added separately in the generation function
  if (modifierKeywords) {
    return `${userPrompt.trim()}, ${modifierKeywords}`;
  }

  return userPrompt.trim();
}

/**
 * Turkish to English Word Dictionary for Prompt Translation
 * Used for translating Turkish sticker prompts to English for Stable Diffusion
 */
export const turkishToEnglish: Record<string, string> = {
  // Animals / Hayvanlar
  "kedi": "cat", "kediler": "cats", "yavru kedi": "kitten",
  "köpek": "dog", "köpekler": "dogs", "yavru köpek": "puppy",
  "kuş": "bird", "kuşlar": "birds", "papağan": "parrot",
  "tavşan": "rabbit", "tavşanlar": "rabbits",
  "ayı": "bear", "panda": "panda", "kutup ayısı": "polar bear",
  "aslan": "lion", "kaplan": "tiger", "fil": "elephant",
  "zürafa": "giraffe", "maymun": "monkey", "goril": "gorilla",
  "balık": "fish", "köpek balığı": "shark", "yunus": "dolphin",
  "kelebek": "butterfly", "arı": "bee", "uğur böceği": "ladybug",
  "baykuş": "owl", "kartal": "eagle", "penguen": "penguin",
  "fare": "mouse", "hamster": "hamster", "sincap": "squirrel",
  "tilki": "fox", "kurt": "wolf", "geyik": "deer",
  "inek": "cow", "domuz": "pig", "at": "horse", "eşek": "donkey",
  "koyun": "sheep", "keçi": "goat", "tavuk": "chicken", "ördek": "duck",
  "ejderha": "dragon", "unicorn": "unicorn", "dinozor": "dinosaur",

  // Colors / Renkler
  "kırmızı": "red", "mavi": "blue", "yeşil": "green", "sarı": "yellow",
  "turuncu": "orange", "mor": "purple", "pembe": "pink", "siyah": "black",
  "beyaz": "white", "gri": "gray", "kahverengi": "brown", "altın": "gold",
  "gümüş": "silver", "turkuaz": "turquoise", "lacivert": "navy blue",
  "bordo": "burgundy", "bej": "beige", "krem": "cream",
  "pastel": "pastel", "neon": "neon", "parlak": "bright", "mat": "matte",

  // Emotions / Duygular
  "mutlu": "happy", "üzgün": "sad", "kızgın": "angry", "şaşkın": "surprised",
  "korkuluş": "scared", "heyecanlı": "excited", "yorgun": "tired",
  "uykulu": "sleepy", "aşık": "in love", "sevimli": "cute", "komik": "funny",
  "cool": "cool", "havalı": "cool", "sinirli": "annoyed", "meraklı": "curious",
  "şaşırmış": "shocked", "gülümseyen": "smiling", "ağlayan": "crying",
  "gülen": "laughing", "dans eden": "dancing", "uyuyan": "sleeping",

  // Fruits & Food / Meyveler & Yiyecekler
  "elma": "apple", "armut": "pear", "portakal": "orange fruit", "muz": "banana",
  "çilek": "strawberry", "kiraz": "cherry", "üzüm": "grape", "karpuz": "watermelon",
  "kavun": "melon", "şeftali": "peach", "limon": "lemon", "ananas": "pineapple",
  "avokado": "avocado", "nar": "pomegranate", "erik": "plum", "incir": "fig",
  "domates": "tomato", "biber": "pepper", "havuç": "carrot", "salatalık": "cucumber",
  "patates": "potato", "soğan": "onion", "sarımsak": "garlic", "mısır": "corn",
  "ekmek": "bread", "peynir": "cheese", "yumurta": "egg", "süt": "milk",
  "çikolata": "chocolate", "kurabiye": "cookie", "kek": "cupcake",
  "sushi": "sushi", "taco": "taco", "makarna": "pasta noodles", "çorba": "soup",

  // Objects / Nesneler
  "kalp": "heart", "yıldız": "star", "ay": "moon", "güneş": "sun",
  "gökkuşağı": "rainbow", "bulut": "cloud", "yağmur": "rain", "kar": "snow",
  "çiçek": "flower", "gül": "rose", "papatya": "daisy", "lale": "tulip",
  "ağaç": "tree", "yaprak": "leaf", "orman": "forest",
  "dağ": "mountain", "deniz": "sea", "okyanus": "ocean", "nehir": "river",
  "ev": "house", "kale": "castle", "şehir": "city", "köy": "village",
  "araba": "car", "uçak": "airplane", "gemi": "ship", "roket": "rocket",
  "bisiklet": "bicycle", "tren": "train", "otobüs": "bus", "motosiklet": "motorcycle",
  "balon": "balloon", "şeker": "candy", "pasta": "cake", "dondurma": "ice cream",
  "pizza": "pizza", "hamburger": "hamburger", "kahve": "coffee", "çay": "tea",
  "kitap": "book", "kalem": "pencil", "bilgisayar": "computer", "telefon": "phone",
  "müzik": "music", "gitar": "guitar", "piyano": "piano", "davul": "drums",
  "top": "ball", "oyun": "game", "oyuncak": "toy",
  "taç": "crown", "elmas": "diamond", "hazine": "treasure",
  "şemsiye": "umbrella", "saat": "clock", "anahtar": "key", "kilit": "lock",
  "mum": "candle", "lamba": "lamp", "ayna": "mirror", "sandalye": "chair",
  "masa": "table", "yatak": "bed", "kapı": "door", "pencere": "window",
  "bayrak": "flag", "harita": "map", "pusula": "compass",
  "sihir": "magic", "büyü": "spell", "peri": "fairy", "cadı": "witch",
  "hayalet": "ghost", "vampir": "vampire", "zombi": "zombie", "canavar": "monster",
  "robot": "robot", "uzaylı": "alien", "ninja": "ninja", "korsan": "pirate",
  "prenses": "princess", "prens": "prince", "kral": "king", "kraliçe": "queen",
  "şövalye": "knight", "kahraman": "hero", "süper kahraman": "superhero",

  // Adjectives / Sıfatlar
  "büyük": "big", "küçük": "small", "dev": "giant", "minik": "tiny",
  "uzun": "tall", "kısa": "short", "şişman": "fat", "zayıf": "thin",
  "güzel": "beautiful", "yakışıklı": "handsome", "çirkin": "ugly",
  "tatlı": "sweet", "acı": "bitter", "ekşi": "sour", "tuzlu": "salty",
  "sıcak": "hot", "soğuk": "cold", "ılık": "warm",
  "hızlı": "fast", "yavaş": "slow", "güçlü": "strong", "güçsüz": "weak",
  "yumuşak": "soft", "sert": "hard", "pürüzsüz": "smooth", "pürüzlü": "rough",
  "eski": "old", "yeni": "new", "modern": "modern", "antik": "ancient",
  "kabarık": "fluffy", "tüylü": "furry", "parlayan": "glowing", "ışıldayan": "sparkling",

  // Actions / Eylemler
  "koşan": "running", "yürüyen": "walking", "atlayan": "jumping",
  "uçan": "flying", "yüzen": "swimming", "oturan": "sitting",
  "ayakta": "standing", "yatan": "lying", "tırmanan": "climbing",
  "yemek yiyen": "eating", "içen": "drinking", "oynayan": "playing",
  "çalışan": "working", "okuyan": "reading", "yazan": "writing",
  "şarkı söyleyen": "singing", "dans yapan": "dancing", "çizen": "drawing",
  "savaşan": "fighting", "koruyan": "protecting", "kucaklayan": "hugging",

  // Styles / Stiller
  "kawaii": "kawaii", "anime": "anime", "manga": "manga",
  "gerçekçi": "realistic", "karikatür": "cartoon", "çizgi film": "cartoon",
  "pixel": "pixel art", "3d": "3d", "2d": "2d",
  "suluboya": "watercolor", "yağlı boya": "oil painting", "karakalem": "pencil sketch",
  "dijital": "digital art", "minimalist": "minimalist", "retro": "retro", "vintage": "vintage",

  // Common phrases / Yaygın ifadeler
  "bir": "a", "bir tane": "one", "iki": "two", "üç": "three",
  "çok": "very", "fazla": "much", "az": "little", "biraz": "some",
  "ve": "and", "ile": "with", "veya": "or", "ama": "but",
  "üzerinde": "on", "altında": "under", "içinde": "inside", "dışında": "outside",
  "önünde": "in front of", "arkasında": "behind", "yanında": "next to",
  "gibi": "like", "olarak": "as", "için": "for",
  "arka plan": "background", "ön plan": "foreground",
  "beyaz arka plan": "white background", "şeffaf arka plan": "transparent background",
  "basit": "simple", "karmaşık": "complex", "detaylı": "detailed",
};

/**
 * Translates Turkish prompt to English using word matching
 * Preserves English words and only translates Turkish ones
 * 
 * @param turkishPrompt - The prompt in Turkish
 * @returns English translated prompt
 */
export function translatePrompt(turkishPrompt: string): string {
  if (!turkishPrompt.trim()) return "";

  let result = turkishPrompt.toLowerCase();

  // Sort by length descending to match longer phrases first
  const sortedEntries = Object.entries(turkishToEnglish)
    .sort((a, b) => b[0].length - a[0].length);

  for (const [turkish, english] of sortedEntries) {
    // Use word boundary matching to avoid partial replacements
    const regex = new RegExp(`\\b${turkish}\\b`, 'gi');
    result = result.replace(regex, english);
  }

  return result;
}
