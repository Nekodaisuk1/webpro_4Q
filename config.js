// 設定とデータ定義
const CONFIG = {
  // 物理パラメータ
  physics: {
    wallThickness: 40,
    boundaryMargin: 200,
    distance: 80,
    mergeDelay: 200,
    attractionForce: 0.0002,
    restitution: 0.7,
    friction: 0.001,
    groundRestitution: 0.5
  },
  
  // 描画パラメータ
  rendering: {
    baseFontSize: 32,
    emojiFontSize: 48,
    highlightScale: 1.15,
    lerpSpeed: 0.15,
    displayDuration: 2000,
    displayFontSize: 120,
    checkInterval: 100
  },
  
  // 文字形状パラメータ
  text: {
    shapeSize: 32,
    shapeSides: 16,
    shapeScale: 1.2
  }
};

// 文字の組み合わせと絵文字のマッピング
const EMOJI_COMBINATIONS = {
  // 感情系
  'HAHA': '😂',
  'LOL': '🤣',
  'WOW': '😮',
  'OMG': '😱',
  'CRY': '😢',
  'LOVE': '😍',
  'ANGRY': '😠',
  'SLEEP': '😴',
  
  // アクション系
  'OKAY': '👌',
  'GOOD': '👍',
  'RUN': '🏃',
  'WALK': '🚶',
  'JUMP': '🤸',
  'DANCE': '💃',
  'CLAP': '👏',
  'WAVE': '👋',
  
  // 自然系
  'SUN': '☀️',
  'MOON': '🌙',
  'STAR': '⭐',
  'RAIN': '🌧️',
  'SNOW': '❄️',
  'FIRE': '🔥',
  'WATER': '💧',
  'TREE': '🌲',
  'FLOWER': '🌸',
  'CLOUD': '☁️',
  
  // 食べ物系
  'PIZZA': '🍕',
  'CAKE': '🍰',
  'APPLE': '🍎',
  'BREAD': '🍞',
  'BURGER': '🍔',
  'COFFEE': '☕',
  'BEER': '🍺',
  'SUSHI': '🍣',
  
  // 動物系
  'CAT': '🐱',
  'DOG': '🐶',
  'FISH': '🐟',
  'BIRD': '🐦',
  'LION': '🦁',
  'TIGER': '🐯',
  'BEAR': '🐻',
  'PANDA': '🐼',
  
  // その他
  'HEART': '❤️',
  'MUSIC': '🎵',
  'GAME': '🎮',
  'BOOK': '📚',
  'ROCKET': '🚀',
  'CAR': '🚗',
  'GIFT': '🎁',
  'PARTY': '🎉',
  
  // 特殊
  'DELETE': 'DELETE',
  'IORI': 'NAVIGATE',
  
  // 色系
  'RED': 'COLOR_RED',
  'BLUE': 'COLOR_BLUE',
  'GREEN': 'COLOR_GREEN',
  'ORANGE': 'COLOR_ORANGE',
  'PURPLE': 'COLOR_PURPLE',
  'PINK': 'COLOR_PINK',
  'BLACK': 'COLOR_BLACK',
  'WHITE': 'COLOR_WHITE',
  'GRAY': 'COLOR_GRAY'
};

// 色のマッピング
const COLOR_MAP = {
  'COLOR_RED': '#ffcccc',
  'COLOR_BLUE': '#cce5ff',
  'COLOR_GREEN': '#ccffcc',
  'COLOR_ORANGE': '#ffe5cc',
  'COLOR_PURPLE': '#e5ccff',
  'COLOR_PINK': '#ffcce5',
  'COLOR_BLACK': '#333333',
  'COLOR_WHITE': '#ffffff',
  'COLOR_GRAY': '#cccccc'
};

// 部分一致チェック用のキャッシュ
const partialMatchCache = new Map();

// 高速化：組み合わせの文字セット（Set）を事前生成
const COMBO_CHARS = new Set();
for (let combo in EMOJI_COMBINATIONS) {
  for (let char of combo) {
    COMBO_CHARS.add(char);
  }
}
