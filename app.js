// メインアプリケーションロジック

// グローバル状態
const state = {
  mergingGroups: new Map(),
  deleteActive: false,
  deleteStartTime: 0,
  mergeDisplayText: '',
  mergeDisplayStartTime: 0,
  backgroundColor: '#fafafa',
  mouseX: window.innerWidth / 2,
  mouseY: 50,
  isNavigating: false
};

// 全ての有効なグループを見つける（最適化版）
function findAllGroups(charList, index, currentGroup, usedBodies, results, charGroups, neededChars, requiredCount) {
  if (index >= charList.length) {
    if (currentGroup.length >= requiredCount) {
      results.push([...currentGroup]);
    }
    return;
  }
  
  const char = charList[index];
  const count = neededChars[char];
  const availableBodies = charGroups[char].filter(b => !usedBodies.has(b));
  
  if (availableBodies.length < count) {
    if (currentGroup.length >= requiredCount) {
      results.push([...currentGroup]);
    }
    findAllGroups(charList, index + 1, currentGroup, usedBodies, results, charGroups, neededChars, requiredCount);
    return;
  }
  
  const combinations = getCombinations(availableBodies, count);
  
  for (let combo of combinations) {
    const newGroup = [...currentGroup, ...combo];
    const newUsed = new Set([...usedBodies, ...combo]);
    
    // グループ内の距離をチェック
    let validGroup = true;
    const maxDist = getMaxDistance(newGroup);
    
    if (maxDist > CONFIG.physics.distance) {
      validGroup = false;
    }
    
    if (!validGroup) continue;
    
    findAllGroups(charList, index + 1, newGroup, newUsed, results, charGroups, neededChars, requiredCount);
  }
}

// 絵文字組み合わせチェック（最適化版）
function checkEmojiCombination(world, ground) {
  const bodies = Composite.allBodies(world);
  const distance = CONFIG.physics.distance;
  const mergeDelay = CONFIG.physics.mergeDelay;
  const attractionForce = CONFIG.physics.attractionForce;
  
  const currentTime = Date.now();
  const possibleCombos = [];
  
  // 各組み合わせをチェック
  for (let combo in EMOJI_COMBINATIONS) {
    // ハイライト表示用（3文字→2文字、4文字以上→3文字）
    const highlightCount = combo.length >= 4 ? 3 : (combo.length >= 3 ? 2 : combo.length);
    // マージ用（全文字必要）
    const mergeCount = combo.length;
    
    // 文字種ごとに必要な数をカウント
    const neededChars = {};
    for (let char of combo) {
      neededChars[char] = (neededChars[char] || 0) + 1;
    }
    
    // 距離内の候補を取得
    const candidateBodies = bodies.filter(b => 
      !b.isStatic && 
      !b.isEmoji && 
      b.renderSprite && 
      combo.includes(b.renderSprite)
    );
    
    if (candidateBodies.length < highlightCount) continue;
    
    // 文字種ごとにグループ化
    const charGroups = {};
    for (let char in neededChars) {
      charGroups[char] = candidateBodies.filter(b => b.renderSprite === char);
    }
    
    const charList = Object.keys(neededChars);
    
    // 全ての可能なグループを見つける（完全なもの含む）
    const allGroups = [];
    findAllGroups(charList, 0, [], new Set(), allGroups, charGroups, neededChars, highlightCount);
    
    // 各グループについて、マージ可能かどうかを判定
    for (let group of allGroups) {
      const maxDist = getMaxDistance(group);
      const canMerge = group.length === mergeCount; // 全文字揃っている
      
      possibleCombos.push({
        combo: combo,
        bodies: group,
        completeness: group.length,
        maxDistance: maxDist,
        canMerge: canMerge
      });
    }
  }
  
  // ソート（マージ可能 > 完成度 > 距離）
  if (possibleCombos.length > 0) {
    possibleCombos.sort((a, b) => {
      // マージ可能なものを優先
      if (a.canMerge !== b.canMerge) {
        return b.canMerge ? 1 : -1;
      }
      // 完成度が高い方を優先
      if (b.completeness !== a.completeness) {
        return b.completeness - a.completeness;
      }
      // 距離が近い方を優先
      return a.maxDistance - b.maxDistance;
    });
    
    const usedBodies = new Set();
    
    for (let comboData of possibleCombos) {
      const isAvailable = comboData.bodies.every(body => !usedBodies.has(body));
      
      if (isAvailable) {
        for (let body of comboData.bodies) {
          usedBodies.add(body);
        }
        
        const groupId = comboData.bodies.map(b => b.id).sort().join('-');
        
        // マージ可能なグループのみ処理
        if (comboData.canMerge) {
          if (!state.mergingGroups.has(groupId)) {
            state.mergingGroups.set(groupId, {
              bodies: comboData.bodies,
              startTime: currentTime,
              combo: comboData.combo
            });
          } else {
            const group = state.mergingGroups.get(groupId);
            const center = getCenter(comboData.bodies);
            
            // 引き寄せる
            for (let body of comboData.bodies) {
              const dx = center.x - body.position.x;
              const dy = center.y - body.position.y;
              Matter.Body.applyForce(body, body.position, {
                x: dx * attractionForce,
                y: dy * attractionForce
              });
            }
            
            // マージ処理
            if (currentTime - group.startTime >= mergeDelay) {
              ground = handleMerge(comboData.combo, comboData.bodies, center, currentTime, world, ground);
              state.mergingGroups.delete(groupId);
            }
          }
        }
      }
    }
  }
  
  // クリーンアップ
  cleanupGroups(bodies, distance);
  
  // 更新されたgroundを返す
  return ground;
}

// マージ処理
function handleMerge(combo, usedBodies, center, currentTime, world, ground) {
  const emoji = EMOJI_COMBINATIONS[combo];
  
  // 削除処理
  for (let body of usedBodies) {
    Composite.remove(world, body);
  }
  
  // DELETE処理
  if (combo === 'DELETE') {
    state.deleteActive = true;
    state.deleteStartTime = currentTime;
    if (ground) {
      Composite.remove(world, ground);
    }
    return null; // 床を削除したのでnullを返す
  }
  
  // IORI - ページ遷移処理
  if (emoji === 'NAVIGATE') {
    // TODO: ページ遷移処理を実装
    
    return ground;
  }
  
  // 色変更処理
  if (emoji.startsWith('COLOR_')) {
    state.backgroundColor = COLOR_MAP[emoji] || '#fafafa';
    state.mergeDisplayText = combo;
    state.mergeDisplayStartTime = currentTime;
    return ground;
  }
  
  // 絵文字生成
  const vertices = getTextVertices(emoji, CONFIG.rendering.emojiFontSize);
  const emojiBody = Bodies.fromVertices(center.x, center.y, vertices, {
    restitution: CONFIG.physics.restitution,
    friction: CONFIG.physics.friction,
    render: {
      fillStyle: "#fff",
      strokeStyle: "#666",
      lineWidth: 1
    }
  });
  
  emojiBody.renderSprite = emoji;
  emojiBody.isEmoji = true;
  
  Composite.add(world, emojiBody);
  
  state.mergeDisplayText = combo;
  state.mergeDisplayStartTime = currentTime;
  
  return ground;
}

// グループクリーンアップ
function cleanupGroups(bodies, distance) {
  const groupsToDelete = [];
  
  for (let [groupId, group] of state.mergingGroups) {
    const { bodies: groupBodies } = group;
    
    let allExist = groupBodies.every(body => bodies.includes(body));
    
    if (!allExist) {
      groupsToDelete.push(groupId);
      continue;
    }
    
    const maxDist = getMaxDistance(groupBodies);
    if (maxDist > distance * 1.5) {
      groupsToDelete.push(groupId);
    }
  }
  
  groupsToDelete.forEach(id => state.mergingGroups.delete(id));
}
