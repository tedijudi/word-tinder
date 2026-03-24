/* ================================================
   WordSwipe - 메인 앱 로직
================================================ */

// ── 상태 변수 ──────────────────────────────────
let allSets      = [];   // 전체 단어 세트
let currentSet   = [];   // 현재 학습 중인 단어 배열
let currentIndex = 0;    // 현재 카드 인덱스
let results      = { know: [], again: [], star: [] };
let isDragging   = false;
let startX = 0, startY = 0;
let currentX = 0, currentY = 0;
let topCard  = null;     // 현재 드래그 중인 카드 DOM

// ── DOM 참조 ───────────────────────────────────
const screenHome   = document.getElementById('screen-home');
const screenSwipe  = document.getElementById('screen-swipe');
const screenResult = document.getElementById('screen-result');
const setList      = document.getElementById('set-list');
const cardStack    = document.getElementById('card-stack');
const swipeTitle   = document.getElementById('swipe-title');
const swipeProgress= document.getElementById('swipe-progress');
const progressFill = document.getElementById('progress-bar-fill');
const stampKnow    = document.getElementById('stamp-know');
const stampAgain   = document.getElementById('stamp-again');
const stampStar    = document.getElementById('stamp-star');
const statKnow     = document.getElementById('stat-know');
const statAgain    = document.getElementById('stat-again');
const statStar     = document.getElementById('stat-star');
const resultSetName= document.getElementById('result-set-name');

// ================================================
// 1. 초기화: JSON 로드
// ================================================
async function init() {
  try {
    const res  = await fetch('words.json');
    const data = await res.json();
    allSets = data.wordSets;
    renderHome();
  } catch (e) {
    alert('words.json 파일을 불러올 수 없어요.\nLive Server로 실행했는지 확인하세요!');
    console.error(e);
  }
}

// ================================================
// 2. 홈 화면: 세트 목록 렌더링
// ================================================
function renderHome() {
  setList.innerHTML = '';

  const levelEmoji = {
    Basic:        '🟢',
    Intermediate: '🔵',
    Advanced:     '🟣',
  };

  allSets.forEach(set => {
    const card = document.createElement('div');
    card.className = 'set-card';
    card.innerHTML = `
      <div class="set-badge" style="background:${set.color}20">
        <span>${levelEmoji[set.level] || '📚'}</span>
      </div>
      <div class="set-info">
        <div class="set-name">${set.name}</div>
        <span class="set-level" style="background:${set.color}">${set.level}</span>
        <div class="set-count">${set.words.length}개 단어</div>
      </div>
      <div class="set-arrow">›</div>
    `;
    card.addEventListener('click', () => startSession(set));
    setList.appendChild(card);
  });
}

// ================================================
// 3. 학습 세션 시작
// ================================================
function startSession(set) {
  currentSet   = [...set.words];
  currentIndex = 0;
  results      = { know: [], again: [], star: [] };

  swipeTitle.textContent = set.name;
  updateProgress();

  showScreen('swipe');
  renderCards();
}

// ================================================
// 4. 카드 렌더링 (스택 3장)
// ================================================
function renderCards() {
  cardStack.innerHTML = '';

  // 뒤에서부터 렌더링 (z-index 순서)
  const total = Math.min(3, currentSet.length - currentIndex);

  for (let i = total - 1; i >= 0; i--) {
    const wordData = currentSet[currentIndex + i];
    if (!wordData) continue;

    const card = createCard(wordData);

    if (i === 0) {
      card.classList.add('top-card');
      attachDragEvents(card);
    } else if (i === 1) {
      card.classList.add('stack-1');
    } else if (i === 2) {
      card.classList.add('stack-2');
    }

    cardStack.appendChild(card);
  }

  topCard = cardStack.querySelector('.top-card');
}

// ================================================
// 5. 카드 DOM 생성
// ================================================
function createCard(word) {
  const card = document.createElement('div');
  card.className = 'word-card';
  card.dataset.word = word.w;

  // 레벨 뱃지 클래스
  const levelClass = {
    Basic:        'badge-level-basic',
    Intermediate: 'badge-level-intermediate',
    Advanced:     'badge-level-advanced',
  };

  // 품사 한글 변환
  const posKr = { noun: '명사', verb: '동사', adjective: '형용사' };

  // 단어 길이에 따라 폰트 크기 조절
  const wordClass = word.w.length > 10 ? 'card-word card-word-small' : 'card-word';

  card.innerHTML = `
    <div class="card-inner">

      <!-- 앞면 -->
      <div class="card-front">
        <div class="card-badges">
          <span class="badge badge-pos">${posKr[word.pos] || word.pos}</span>
          <span class="badge ${levelClass[word.level] || 'badge-level-basic'}">
            ${word.level || 'Basic'}
          </span>
        </div>
        <div class="${wordClass}">${word.w}</div>
        <div class="card-hint">
          <span>👆 탭하여 뜻 보기</span>
        </div>
      </div>

      <!-- 뒷면 -->
      <div class="card-back">
        <div class="card-badges">
          <span class="badge badge-pos">${posKr[word.pos] || word.pos}</span>
        </div>
        <div class="card-meaning">${word.m}</div>
        <div class="card-mnemonic">${word.m_rich}</div>
        <div class="card-divider"></div>
        <div class="card-example">${word.ex.replace('_____', '<u>_____</u>')}</div>
        <div class="card-translation">${word.t}</div>
      </div>

    </div>
  `;

  // 탭(클릭)하면 카드 뒤집기
  card.addEventListener('click', (e) => {
    // 드래그 중엔 클릭 무시
    if (Math.abs(currentX - startX) > 5 || Math.abs(currentY - startY) > 5) return;
    const inner = card.querySelector('.card-inner');
    inner.classList.toggle('flipped');
  });

  return card;
}

// ================================================
// 6. 드래그 이벤트 연결 (마우스 + 터치)
// ================================================
function attachDragEvents(card) {
  // 마우스
  card.addEventListener('mousedown',  onDragStart);
  // 터치
  card.addEventListener('touchstart', onDragStart, { passive: true });
}

function onDragStart(e) {
  if (e.target.closest('button')) return;

  isDragging = true;
  const point = e.touches ? e.touches[0] : e;
  startX = point.clientX;
  startY = point.clientY;
  currentX = startX;
  currentY = startY;

  topCard = cardStack.querySelector('.top-card');
  if (!topCard) return;

  topCard.style.transition = 'none';

  document.addEventListener('mousemove',  onDragMove);
  document.addEventListener('mouseup',    onDragEnd);
  document.addEventListener('touchmove',  onDragMove, { passive: true });
  document.addEventListener('touchend',   onDragEnd);
}

function onDragMove(e) {
  if (!isDragging || !topCard) return;

  const point = e.touches ? e.touches[0] : e;
  currentX = point.clientX;
  currentY = point.clientY;

  const dx = currentX - startX;
  const dy = currentY - startY;
  const rotate = dx * 0.08; // 기울기

  // 카드 이동
  topCard.style.transform = `translate(${dx}px, ${dy}px) rotate(${rotate}deg)`;

  // 도장 표시
  const threshold = 60;
  hideAllStamps();

  if (dx > threshold) {
    showStamp('know', Math.min((dx - threshold) / 60, 1));
    topCard.classList.add('card-dragging-right');
    topCard.classList.remove('card-dragging-left', 'card-dragging-up');
  } else if (dx < -threshold) {
    showStamp('again', Math.min((-dx - threshold) / 60, 1));
    topCard.classList.add('card-dragging-left');
    topCard.classList.remove('card-dragging-right', 'card-dragging-up');
  } else if (dy < -threshold) {
    showStamp('star', Math.min((-dy - threshold) / 60, 1));
    topCard.classList.add('card-dragging-up');
    topCard.classList.remove('card-dragging-right', 'card-dragging-left');
  } else {
    topCard.classList.remove('card-dragging-right', 'card-dragging-left', 'card-dragging-up');
  }
}

function onDragEnd(e) {
  if (!isDragging || !topCard) return;
  isDragging = false;

  document.removeEventListener('mousemove',  onDragMove);
  document.removeEventListener('mouseup',    onDragEnd);
  document.removeEventListener('touchmove',  onDragMove);
  document.removeEventListener('touchend',   onDragEnd);

  const dx = currentX - startX;
  const dy = currentY - startY;
  const threshold = 100;

  topCard.classList.remove('card-dragging-right', 'card-dragging-left', 'card-dragging-up');

  if (dx > threshold) {
    flyOut('right');
  } else if (dx < -threshold) {
    flyOut('left');
  } else if (dy < -threshold) {
    flyOut('up');
  } else {
    // 제자리로 돌아오기
    snapBack();
  }

  hideAllStamps();
}

// ================================================
// 7. 카드 날아가기 애니메이션
// ================================================
function flyOut(direction) {
  if (!topCard) return;

  const word = topCard.dataset.word;
  const wordData = currentSet[currentIndex];

  let tx = 0, ty = 0, rotate = 0;

  if (direction === 'right') {
    tx = window.innerWidth + 200;
    ty = 50;
    rotate = 20;
    results.know.push(wordData);
  } else if (direction === 'left') {
    tx = -(window.innerWidth + 200);
    ty = 50;
    rotate = -20;
    results.again.push(wordData);
  } else if (direction === 'up') {
    tx = 0;
    ty = -(window.innerHeight + 200);
    rotate = 0;
    results.star.push(wordData);
  }

  topCard.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s';
  topCard.style.transform  = `translate(${tx}px, ${ty}px) rotate(${rotate}deg)`;
  topCard.style.opacity    = '0';

  setTimeout(() => {
    currentIndex++;
    updateProgress();

    if (currentIndex >= currentSet.length) {
      // 모든 카드 소진 → 결과 화면
      setTimeout(showResult, 200);
    } else {
      renderCards();
    }
  }, 400);
}

// ================================================
// 8. 카드 제자리로 (snapBack)
// ================================================
function snapBack() {
  if (!topCard) return;
  topCard.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
  topCard.style.transform  = 'translate(0px, 0px) rotate(0deg)';
}

// ================================================
// 9. 도장 표시/숨기기
// ================================================
function showStamp(type, intensity) {
  const stamp = { know: stampKnow, again: stampAgain, star: stampStar }[type];
  if (!stamp) return;

  const scale = 0.8 + intensity * 0.4;
  stamp.style.opacity   = Math.min(intensity * 1.5, 1);

  if (type === 'know') {
    stamp.style.transform = `translateY(-50%) scale(${scale}) rotate(-15deg)`;
  } else if (type === 'again') {
    stamp.style.transform = `translateY(-50%) scale(${scale}) rotate(15deg)`;
  } else {
    stamp.style.transform = `translateX(-50%) scale(${scale})`;
  }
}

function hideAllStamps() {
  stampKnow.style.opacity  = '0';
  stampAgain.style.opacity = '0';
  stampStar.style.opacity  = '0';
  stampKnow.style.transform  = 'translateY(-50%) scale(0) rotate(-15deg)';
  stampAgain.style.transform = 'translateY(-50%) scale(0) rotate(15deg)';
  stampStar.style.transform  = 'translateX(-50%) scale(0)';
}

// ================================================
// 10. 진행률 업데이트
// ================================================
function updateProgress() {
  const total   = currentSet.length;
  const current = currentIndex + 1;
  const done    = Math.min(currentIndex, total);

  swipeProgress.textContent = `${Math.min(current, total)} / ${total}`;
  progressFill.style.width  = `${(done / total) * 100}%`;
}

// ================================================
// 11. 결과 화면
// ================================================
function showResult() {
  statKnow.textContent  = results.know.length;
  statAgain.textContent = results.again.length;
  statStar.textContent  = results.star.length;
  resultSetName.textContent = swipeTitle.textContent;
  progressFill.style.width = '100%';
  showScreen('result');
}

// ================================================
// 12. 하단 버튼 이벤트
// ================================================
document.getElementById('btn-know').addEventListener('click', () => {
  if (!topCard) return;
  showStamp('know', 1);
  setTimeout(() => { hideAllStamps(); flyOut('right'); }, 150);
});

document.getElementById('btn-again').addEventListener('click', () => {
  if (!topCard) return;
  showStamp('again', 1);
  setTimeout(() => { hideAllStamps(); flyOut('left'); }, 150);
});

document.getElementById('btn-star').addEventListener('click', () => {
  if (!topCard) return;
  showStamp('star', 1);
  setTimeout(() => { hideAllStamps(); flyOut('up'); }, 150);
});

// ================================================
// 13. 뒤로가기 버튼
// ================================================
document.getElementById('btn-back').addEventListener('click', () => {
  showScreen('home');
});

// ================================================
// 14. 결과 화면 버튼
// ================================================

// 틀린 것만 다시
document.getElementById('btn-retry').addEventListener('click', () => {
  if (results.again.length === 0) {
    alert('다시 볼 단어가 없어요! 모두 완벽하게 외웠네요 🎉');
    return;
  }
  currentSet   = [...results.again];
  currentIndex = 0;
  results      = { know: [], again: [], star: [] };
  updateProgress();
  showScreen('swipe');
  renderCards();
});

// 홈으로
document.getElementById('btn-home').addEventListener('click', () => {
  showScreen('home');
});

// ================================================
// 15. 화면 전환
// ================================================
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(`screen-${name}`).classList.add('active');
}

// ================================================
// 16. 카드에 레벨 정보 주입 (renderCards 보조)
// ================================================
// words.json에 level 필드가 없으므로 set에서 주입
function startSession(set) {
  // 각 단어에 세트의 level 정보 주입
  currentSet = set.words.map(w => ({ ...w, level: set.level }));
  currentIndex = 0;
  results = { know: [], again: [], star: [] };

  swipeTitle.textContent = set.name;
  updateProgress();

  showScreen('swipe');
  renderCards();
}

// ================================================
// 🚀 앱 시작
// ================================================
init();
