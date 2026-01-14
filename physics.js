// 物理エンジン関連の関数

// 文字形状のキャッシュ（パフォーマンス最適化）
const verticesCache = new Map();

// 文字の形状から頂点を生成する関数（キャッシュ付き）
function getTextVertices(char, fontSize = 32) {
  const cacheKey = `${char}_${fontSize}`;
  
  // キャッシュチェック
  if (verticesCache.has(cacheKey)) {
    return verticesCache.get(cacheKey);
  }
  
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  
  const size = fontSize * 3;
  tempCanvas.width = size;
  tempCanvas.height = size;
  
  tempCtx.font = `bold ${fontSize}px sans-serif`;
  tempCtx.textAlign = 'center';
  tempCtx.textBaseline = 'middle';
  tempCtx.fillStyle = '#000';
  tempCtx.fillText(char, size / 2, size / 2);
  
  const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
  const data = imageData.data;
  
  // 文字の境界を検出
  let minX = size, maxX = 0, minY = size, maxY = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const alpha = data[(y * size + x) * 4 + 3];
      if (alpha > 50) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }
  
  // 実際の文字サイズ
  const width = Math.max(maxX - minX, fontSize * 0.3);
  const height = Math.max(maxY - minY, fontSize * 0.8);
  
  // 文字の実際の中心位置を計算
  const actualCenterX = (minX + maxX) / 2;
  const actualCenterY = (minY + maxY) / 2;
  const offsetX = actualCenterX - size / 2;
  const offsetY = actualCenterY - size / 2;
  
  // 当たり判定を一回り大きくする
  const scale = CONFIG.text.shapeScale;
  
  // 文字の形に合わせた頂点を作成
  const vertices = [];
  const sides = CONFIG.text.shapeSides;
  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * Math.PI * 2;
    const radiusX = width / 2 * scale;
    const radiusY = height / 2 * scale;
    vertices.push({
      x: Math.cos(angle) * radiusX + offsetX,
      y: Math.sin(angle) * radiusY + offsetY
    });
  }
  
  // キャッシュに保存
  verticesCache.set(cacheKey, vertices);
  
  return vertices;
}

// 部分一致をチェックする関数（最適化版）
function checkPartialMatch(char) {
  // キャッシュチェック
  if (partialMatchCache.has(char)) {
    return partialMatchCache.get(char);
  }
  
  // 事前生成したSetで高速チェック
  const result = COMBO_CHARS.has(char);
  partialMatchCache.set(char, result);
  return result;
}

// 組み合わせを生成するヘルパー関数
function getCombinations(arr, count) {
  if (count === 1) return arr.map(item => [item]);
  if (count >= arr.length) return [arr];
  
  const results = [];
  for (let i = 0; i <= arr.length - count; i++) {
    const head = arr[i];
    const tailCombos = getCombinations(arr.slice(i + 1), count - 1);
    for (let tail of tailCombos) {
      results.push([head, ...tail]);
    }
  }
  return results;
}

// 距離計算の最適化版
function getDistance(pos1, pos2) {
  const dx = pos1.x - pos2.x;
  const dy = pos1.y - pos2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// グループの最大距離を計算
function getMaxDistance(bodies) {
  let maxDist = 0;
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const dist = getDistance(bodies[i].position, bodies[j].position);
      maxDist = Math.max(maxDist, dist);
    }
  }
  return maxDist;
}

// 中心点を計算
function getCenter(bodies) {
  let centerX = 0, centerY = 0;
  for (let body of bodies) {
    centerX += body.position.x;
    centerY += body.position.y;
  }
  return {
    x: centerX / bodies.length,
    y: centerY / bodies.length
  };
}
