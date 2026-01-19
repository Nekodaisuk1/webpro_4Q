// メイン初期化とレンダリングループ

const { Engine, Runner, Bodies, Composite } = Matter;

// 物理エンジン作成
const engine = Engine.create();
const world = engine.world;

// グローバルスコープに公開（ボタンからアクセスできるように）
window.world = world;
window.state = state;
window.ground = null;

// キャンバス設定
const canvas = document.getElementById("world");
const mainContent = document.getElementById("main-content");
// 4:3の縦横比でキャンバスサイズを設定
const aspectRatio = 4 / 3;
if (window.innerWidth / window.innerHeight > aspectRatio) {
  canvas.height = window.innerHeight;
  canvas.width = canvas.height * aspectRatio;
} else {
  canvas.width = window.innerWidth;
  canvas.height = canvas.width / aspectRatio;
}
const ctx = canvas.getContext('2d');

Runner.run(Runner.create(), engine);

// 地面と壁
let ground = Bodies.rectangle(
  canvas.width/2, 
  canvas.height-20, 
  canvas.width, 
  CONFIG.physics.wallThickness, 
  { 
    isStatic: true,
    restitution: CONFIG.physics.groundRestitution
  }
);

// グローバルに公開
window.ground = ground;

let leftWall = Bodies.rectangle(
  CONFIG.physics.wallThickness/2, 
  canvas.height/2, 
  CONFIG.physics.wallThickness, 
  canvas.height, 
  {
    isStatic: true,
    restitution: CONFIG.physics.groundRestitution
  }
);

let rightWall = Bodies.rectangle(
  canvas.width - CONFIG.physics.wallThickness/2, 
  canvas.height/2, 
  CONFIG.physics.wallThickness, 
  canvas.height, 
  {
    isStatic: true,
    restitution: CONFIG.physics.groundRestitution
  }
);

Composite.add(world, [ground, leftWall, rightWall]);

// ウィンドウリサイズ対応
window.addEventListener('resize', () => {
  // 4:3の縦横比でキャンバスサイズを設定
  const aspectRatio = 4 / 3;
  if (window.innerWidth / window.innerHeight > aspectRatio) {
    canvas.height = window.innerHeight;
    canvas.width = canvas.height * aspectRatio;
  } else {
    canvas.width = window.innerWidth;
    canvas.height = canvas.width / aspectRatio;
  }
  
  Composite.remove(world, [ground, leftWall, rightWall]);
  
  ground = Bodies.rectangle(
    canvas.width/2, 
    canvas.height-20, 
    canvas.width, 
    CONFIG.physics.wallThickness, 
    { 
      isStatic: true,
      restitution: CONFIG.physics.groundRestitution
    }
  );
  
  leftWall = Bodies.rectangle(
    CONFIG.physics.wallThickness/2, 
    canvas.height/2, 
    CONFIG.physics.wallThickness, 
    canvas.height, 
    {
      isStatic: true,
      restitution: CONFIG.physics.groundRestitution
    }
  );
  
  rightWall = Bodies.rectangle(
    canvas.width - CONFIG.physics.wallThickness/2, 
    canvas.height/2, 
    CONFIG.physics.wallThickness, 
    canvas.height, 
    {
      isStatic: true,
      restitution: CONFIG.physics.groundRestitution
    }
  );
  
  Composite.add(world, [ground, leftWall, rightWall]);
});

// マウストラッキング
document.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  // キャンバスの実際のサイズと表示サイズの比率を計算
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  
  state.mouseX = (e.clientX - rect.left) * scaleX;
  state.mouseY = (e.clientY - rect.top) * scaleY;
});

// キー入力で文字追加
document.addEventListener("keydown", (e) => {
  const char = e.key.toUpperCase();
  if (char.length !== 1) return;
  
  const vertices = getTextVertices(char);
  
  const textBody = Bodies.fromVertices(state.mouseX, state.mouseY, vertices, {
    restitution: CONFIG.physics.restitution,
    friction: CONFIG.physics.friction,
    render: {
      fillStyle: "#fff",
      strokeStyle: "#666",
      lineWidth: 1
    }
  });
  
  textBody.renderSprite = char;
  Composite.add(world, textBody);
});

// 定期的な組み合わせチェック
setInterval(() => {
  const result = checkEmojiCombination(world, ground);
  if (result !== undefined) {
    ground = result;
  }
}, CONFIG.rendering.checkInterval);

// レンダリングループ（最適化版）
function render() {
  requestAnimationFrame(render);
  
  // 背景描画
  ctx.fillStyle = state.backgroundColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  const bodies = Composite.allBodies(world);
  
  // 画面外削除
  const bodiesToRemove = [];
  for (let body of bodies) {
    if (!body.isStatic && body.renderSprite) {
      const pos = body.position;
      if (pos.x < -CONFIG.physics.boundaryMargin || 
          pos.x > canvas.width + CONFIG.physics.boundaryMargin ||
          pos.y < -CONFIG.physics.boundaryMargin || 
          pos.y > canvas.height + CONFIG.physics.boundaryMargin) {
        bodiesToRemove.push(body);
      }
    }
  }
  bodiesToRemove.forEach(body => Composite.remove(world, body));
  
  // ハイライト計算
  const bodyHighlights = new Map();
  const validPairs = new Set();
  const possibleCombos = [];
  
  // 組み合わせ評価（簡略版 - レンダリング用）
  for (let combo in EMOJI_COMBINATIONS) {
    const requiredCount = combo.length >= 4 ? 3 : (combo.length >= 3 ? 2 : combo.length);
    
    const neededChars = {};
    for (let char of combo) {
      neededChars[char] = (neededChars[char] || 0) + 1;
    }
    
    const candidateBodies = bodies.filter(b => 
      !b.isStatic && 
      !b.isEmoji && 
      b.renderSprite && 
      combo.includes(b.renderSprite)
    );
    
    if (candidateBodies.length < requiredCount) continue;
    
    const charGroups = {};
    for (let char in neededChars) {
      charGroups[char] = candidateBodies.filter(b => b.renderSprite === char);
    }
    
    const charList = Object.keys(neededChars);
    const allGroups = [];
    findAllGroups(charList, 0, [], new Set(), allGroups, charGroups, neededChars, requiredCount);
    
    for (let group of allGroups) {
      const maxDist = getMaxDistance(group);
      possibleCombos.push({
        combo: combo,
        bodies: group,
        completeness: group.length,
        maxDistance: maxDist
      });
    }
  }
  
  if (possibleCombos.length > 0) {
    possibleCombos.sort((a, b) => {
      if (b.completeness !== a.completeness) {
        return b.completeness - a.completeness;
      }
      return a.maxDistance - b.maxDistance;
    });
    
    const usedBodies = new Set();
    
    for (let comboData of possibleCombos) {
      const isAvailable = comboData.bodies.every(body => !usedBodies.has(body));
      
      if (isAvailable) {
        for (let body of comboData.bodies) {
          bodyHighlights.set(body, true);
          usedBodies.add(body);
        }
        
        for (let i = 0; i < comboData.bodies.length; i++) {
          for (let j = i + 1; j < comboData.bodies.length; j++) {
            const bodyA = comboData.bodies[i];
            const bodyB = comboData.bodies[j];
            const pairId = bodyA.id < bodyB.id ? `${bodyA.id}-${bodyB.id}` : `${bodyB.id}-${bodyA.id}`;
            validPairs.add(pairId);
          }
        }
      }
    }
  }
  
  // デバッグライン描画
  ctx.strokeStyle = 'rgba(255, 107, 107, 0.3)';
  ctx.lineWidth = 2;
  for (let body of bodies) {
    if (!body.renderSprite || body.isStatic || body.isEmoji) continue;
    
    for (let other of bodies) {
      if (body.id >= other.id || !other.renderSprite || other.isStatic || other.isEmoji) continue;
      
      const pairId = `${body.id}-${other.id}`;
      if (validPairs.has(pairId)) {
        ctx.beginPath();
        ctx.moveTo(body.position.x, body.position.y);
        ctx.lineTo(other.position.x, other.position.y);
        ctx.stroke();
      }
    }
  }
  
  // ボディ描画
  for (let body of bodies) {
    if (!body.renderSprite) continue;
    
    ctx.save();
    ctx.translate(body.position.x, body.position.y);
    ctx.rotate(body.angle);
    
    const baseFontSize = body.isEmoji ? CONFIG.rendering.emojiFontSize : CONFIG.rendering.baseFontSize;
    const shouldHighlight = bodyHighlights.get(body) || false;
    
    let targetSize = baseFontSize;
    if (shouldHighlight && !body.isEmoji) {
      targetSize = baseFontSize * CONFIG.rendering.highlightScale;
    }
    
    if (!body.currentFontSize) {
      body.currentFontSize = baseFontSize;
    }
    
    body.currentFontSize += (targetSize - body.currentFontSize) * CONFIG.rendering.lerpSpeed;
    
    ctx.font = `bold ${Math.round(body.currentFontSize)}px sans-serif`;
    ctx.fillStyle = shouldHighlight ? "#FF6B6B" : "#000";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(body.renderSprite, 0, 0);
    
    ctx.restore();
  }
  
  // 中央表示
  const currentTime = Date.now();
  let displayText = '';
  let displayColor = '';
  let displayStartTime = 0;
  
  if (state.deleteActive) {
    displayText = 'DELETE';
    displayColor = 'rgba(255, 0, 0, ';
    displayStartTime = state.deleteStartTime;
  } else if (state.mergeDisplayText) {
    displayText = state.mergeDisplayText;
    displayColor = 'rgba(100, 200, 255, ';
    displayStartTime = state.mergeDisplayStartTime;
  }
  
  if (displayText) {
    const elapsed = currentTime - displayStartTime;
    
    if (elapsed < CONFIG.rendering.displayDuration) {
      const alpha = Math.max(0, 1 - elapsed / CONFIG.rendering.displayDuration);
      
      ctx.save();
      ctx.font = `bold ${CONFIG.rendering.displayFontSize}px sans-serif`;
      ctx.fillStyle = displayColor + alpha + ')';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(displayText, canvas.width / 2, canvas.height / 2);
      ctx.restore();
    } else {
      if (state.deleteActive) {
        state.deleteActive = false;
        if (!window.ground) {
          const newGround = Bodies.rectangle(
            canvas.width/2, 
            canvas.height-20, 
            canvas.width, 
            CONFIG.physics.wallThickness, 
            { 
              isStatic: true,
              restitution: CONFIG.physics.groundRestitution
            }
          );
          Composite.add(world, newGround);
          ground = newGround;
          window.ground = newGround;
        }
      } else {
        state.mergeDisplayText = '';
      }
    }
  }
}

render();
