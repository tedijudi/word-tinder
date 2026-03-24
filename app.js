/* ================================================
   WordSwipe - 틴더 스타일 단어 앱
================================================ */

// ── 상태 ──────────────────────────────────────
let allSets      = [];
let currentWords = [];
let currentIdx   = 0;
let results      = { know: [], nope: [], star: [] };
let currentSetName = '';

// 드래그 상태
let dragging = false;
let startX   = 0, startY = 0;
let nowX     = 0, nowY   = 0;
let topCard  = null;

// ── DOM ───────────────────────────────────────
const $ = id => document.getElementById(id);

const cardsArea     = $('cards-area');
const topTitle      = $('top-title');
const topProg       = $('top-progress');
const progFill      = $('prog-fill');
const sKnow         = $('s-know');
const sNope         = $('s-nope');
const sStar         = $('s-star');
const rcKnow        = $('rc-know');
const rcNope        = $('rc-nope');
const rcStar        = $('rc-star');
const resultSetname = $('result-setname');
const hintLeft      = document.querySelector('.hint-left');
const hintRight     = document.querySelector('.hint-right');

// ================================================
// 초기화
// ================================================
async function init() {
  try {
    const res  = await fetch('words.json');
    const data = await res.json();
    allSets = data.wordSets;
    renderHome();
  } catch(e) {
    alert('words.json을 불러올 수 없어요!\nLive Server 또는 GitHub Pages로 실행하세요.');
    console.error(e);
  }
}

// ================================================
// 홈 렌더링
// ================================================
function renderHome() {
  const homeSets = $('home-sets');
  homeSets.innerHTML = '';

  const emoji = {
    Basic:        '🟢',
    Intermediate: '🔵',
    Advanced:     '🟣'
  };

  allSets.forEach(set => {
    const el = document.createElement('div');
    el.className = 'set-card';
    el.innerHTML = `
      <div class="set-icon" style="background:${set.color}18">
        ${emoji[set.level] || '📚'}
      </div>
      <div class="set-info">
        <div class="set-name">${set.name}</div>
        <span class="set-lv" style="background:${set.color}">${set.level}</span>
        <div class="set-cnt">${set.words.length}개 단어</div>
      </div>
      <div class="set-chevron">›</div>
    `;
    el.addEventListener('click', () => startSession(set));
    homeSets.appendChild(el);
  });
}

// ================================================
// 세션 시작
// ================================================
function startSession(set) {
  currentWords   = set.words.map(w => ({ ...w, level: set.level }));
  currentIdx     = 0;
  currentSetName = set.name;
  results        = { know: [], nope: [], star: [] };

  topTitle.textContent = set.name;
  updateProg();
  showScreen('swipe');
  renderCards();
}

// ================================================
// 카드 렌더링
// ================================================
function renderCards() {
  cardsArea.innerHTML = '';

  const count = Math.min(3, currentWords.length - currentIdx);
  if (count <= 0) return;

  for (let i = count - 1; i >= 0; i--) {
    const word = currentWords[currentIdx + i];
    if (!word) continue;

    const card = makeCard(word);

    if (i === 0) {
      card.classList.add('top');
      bindDrag(card);
    } else if (i === 1) {
      card.classList.add('s1');
    } else {
      card.classList.add('s2');
    }

    cardsArea.appendChild(card);
  }

  topCard = cardsArea.querySelector('.wcard.top');
}

// ================================================
// 카드 생성
// ================================================
function makeCard(word) {
  const card = document.createElement('div');
  card.className = 'wcard';
  card.dataset.w = word.w;

  // 배경 클래스
  const bgClass = {
    Basic:        'bg-basic',
    Intermediate: 'bg-intermediate',
    Advanced:     'bg-advanced',
  }[word.level] || 'bg-basic';

  // 품사 한글
  const posKr = {
    noun:      '명사',
    verb:      '동사',
    adjective: '형용사'
  };

  // 레벨 뱃지 클래스
  const lvClass = {
    Basic:        'badge-lv-basic',
    Intermediate: 'badge-lv-intermediate',
    Advanced:     'badge-lv-advanced',
  }[word.level] || 'badge-lv-basic';

  // 단어 길이별 폰트
  const wLen = word.w.length;
  const wordSize = wLen > 13 ? 'xs' : wLen > 9 ? 'sm' : '';

  // 예문 빈칸 강조
  const exFront = word.ex.replace(/_____/g,
    `<span style="color:#ffd93d;font-weight:800;font-style:normal">_____</span>`
  );
  const exBack = word.ex.replace(/_____/g,
    `<span class="back-ex-blank">_____</span>`
  );

  card.innerHTML = `
    <div class="card-inner">

      <!-- 앞면 -->
      <div class="card-front ${bgClass}">

        <!-- 장식 원 -->
        <div class="deco deco-a"></div>
        <div class="deco deco-b"></div>
        <div class="deco deco-c"></div>

        <!-- 상단: 뱃지 + 연상법 -->
        <div class="front-mnemonic-area">
          <div class="front-badge-row">
            <span class="badge badge-pos">${posKr[word.pos] || word.pos}</span>
            <span class="badge ${lvClass}">${word.level}</span>
          </div>
          <div class="front-mnemonic-box">
            <div class="front-mnemonic-text">${word.m_rich}</div>
          </div>
        </div>

        <!-- 중앙: 영단어 -->
        <div class="front-center">
          <div class="front-word ${wordSize}">${word.w}</div>
        </div>

        <!-- 하단: 예문 -->
        <div class="front-bottom">
          <div class="front-ex">${exFront}</div>
          <div class="front-hint">탭하여 뜻 확인 👆</div>
        </div>

      </div>

      <!-- 뒷면 -->
      <div class="card-back">

        <div class="back-badge-row">
          <span class="back-badge-pos">${posKr[word.pos] || word.pos}</span>
        </div>

        <div class="back-word">${word.w}</div>
        <div class="back-meaning">${word.m}</div>

        <div class="back-divider"></div>

        <div class="back-ex-label">예문</div>
        <div class="back-ex">${exBack}</div>
        <div class="back-tr">${word.t}</div>

        <div class="back-swipe-hint">
          <span class="back-hint-nope">← 몰라요</span>
          <span class="back-hint-know">알아요 →</span>
        </div>

      </div>

    </div>
  `;

  // 탭 → 뒤집기
  card.addEventListener('click', e => {
    const dx = Math.abs(nowX - startX);
    const dy = Math.abs(nowY - startY);
    if (dx > 8 || dy > 8) return;
    card.querySelector('.card-inner').classList.toggle('flipped');
  });

  return card;
}

// ================================================
// 드래그
// ================================================
function bindDrag(card) {
  card.addEventListener('mousedown',  dragStart);
  card.addEventListener('touchstart', dragStart, { passive: true });
}

function dragStart(e) {
  dragging = true;
  const p  = e.touches ? e.touches[0] : e;
  startX   = nowX = p.clientX;
  startY   = nowY = p.clientY;

  topCard = cardsArea.querySelector('.wcard.top');
  if (!topCard) return;
  topCard.style.transition = 'none';

  document.addEventListener('mousemove', dragMove);
  document.addEventListener('touchmove', dragMove, { passive: true });
  document.addEventListener('mouseup',   dragEnd);
  document.addEventListener('touchend',  dragEnd);
}

function dragMove(e) {
  if (!dragging || !topCard) return;
  const p = e.touches ? e.touches[0] : e;
  nowX = p.clientX;
  nowY = p.clientY;

  const dx  = nowX - startX;
  const dy  = nowY - startY;
  const rot = dx * 0.07;

  topCard.style.transform = `translate(${dx}px, ${dy}px) rotate(${rot}deg)`;

  // 글로우 & 도장 & 힌트
  const TH = 50;
  hideStamps();
  topCard.classList.remove('glow-know', 'glow-nope', 'glow-star');

  // 힌트 밝기 초기화
  hintLeft.style.opacity  = '0.5';
  hintRight.style.opacity = '0.5';

  if (dx > TH) {
    const v = Math.min((dx - TH) / 80, 1);
    topCard.classList.add('glow-know');
    showStamp('know', v);
    hintRight.style.opacity = '1';

  } else if (dx < -TH) {
    const v = Math.min((-dx - TH) / 80, 1);
    topCard.classList.add('glow-nope');
    showStamp('nope', v);
    hintLeft.style.opacity = '1';

  } else if (dy < -TH) {
    const v = Math.min((-dy - TH) / 80, 1);
    topCard.classList.add('glow-star');
    showStamp('star', v);
  }
}

function dragEnd() {
  if (!dragging || !topCard) return;
  dragging = false;

  document.removeEventListener('mousemove', dragMove);
  document.removeEventListener('touchmove', dragMove);
  document.removeEventListener('mouseup',   dragEnd);
  document.removeEventListener('touchend',  dragEnd);

  const dx = nowX - startX;
  const dy = nowY - startY;
  const TH = 100;

  topCard.classList.remove('glow-know', 'glow-nope', 'glow-star');
  hideStamps();
  hintLeft.style.opacity  = '0.5';
  hintRight.style.opacity = '0.5';

  if      (dx >  TH) flyOut('right');
  else if (dx < -TH) flyOut('left');
  else if (dy < -TH) flyOut('up');
  else               snapBack();
}

// ================================================
// 카드 날리기
// ================================================
function flyOut(dir) {
  if (!topCard) return;

  const word = currentWords[currentIdx];
  let tx = 0, ty = 0, rot = 0;

  if (dir === 'right') {
    tx  = window.innerWidth + 300;
    ty  = 80;
    rot = 25;
    results.know.push(word);

  } else if (dir === 'left') {
    tx  = -(window.innerWidth + 300);
    ty  = 80;
    rot = -25;
    results.nope.push(word);

  } else {
    tx  = 0;
    ty  = -(window.innerHeight + 300);
    rot = 0;
    results.star.push(word);
  }

  topCard.style.transition =
    'transform 0.42s cubic-bezier(0.4,0,0.2,1), opacity 0.42s';
  topCard.style.transform  =
    `translate(${tx}px, ${ty}px) rotate(${rot}deg)`;
  topCard.style.opacity    = '0';

  setTimeout(() => {
    currentIdx++;
    updateProg();
    if (currentIdx >= currentWords.length) {
      setTimeout(showResult, 150);
    } else {
      renderCards();
    }
  }, 420);
}

// ================================================
// 제자리 복귀
// ================================================
function snapBack() {
  if (!topCard) return;
  topCard.style.transition =
    'transform 0.42s cubic-bezier(0.4,0,0.2,1)';
  topCard.style.transform  = 'translate(0,0) rotate(0deg)';
}

// ================================================
// 도장
// ================================================
function showStamp(type, v) {
  const sc = 0.7 + v * 0.5;
  const op = Math.min(v * 1.8, 1);

  if (type === 'know') {
    sKnow.style.opacity   = op;
    sKnow.style.transform =
      `translateY(-50%) scale(${sc}) rotate(-18deg)`;

  } else if (type === 'nope') {
    sNope.style.opacity   = op;
    sNope.style.transform =
      `translateY(-50%) scale(${sc}) rotate(18deg)`;

  } else {
    sStar.style.opacity   = op;
    sStar.style.transform =
      `translate(-50%,-50%) scale(${sc})`;
  }
}

function hideStamps() {
  sKnow.style.opacity = '0';
  sNope.style.opacity = '0';
  sStar.style.opacity = '0';
  sKnow.style.transform = 'translateY(-50%) scale(0) rotate(-18deg)';
  sNope.style.transform = 'translateY(-50%) scale(0) rotate(18deg)';
  sStar.style.transform = 'translate(-50%,-50%) scale(0)';
}

// ================================================
// 진행률
// ================================================
function updateProg() {
  const total = currentWords.length;
  const done  = Math.min(currentIdx, total);
  topProg.textContent  =
    `${Math.min(currentIdx + 1, total)} / ${total}`;
  progFill.style.width =
    `${(done / total) * 100}%`;
}

// ================================================
// 결과
// ================================================
function showResult() {
  rcKnow.textContent      = results.know.length;
  rcNope.textContent      = results.nope.length;
  rcStar.textContent      = results.star.length;
  resultSetname.textContent = currentSetName;
  progFill.style.width    = '100%';
  showScreen('result');
}

// ================================================
// 버튼
// ================================================
$('btn-nope').addEventListener('click', () => {
  if (!topCard) return;
  showStamp('nope', 1);
  setTimeout(() => { hideStamps(); flyOut('left'); }, 160);
});

$('btn-star').addEventListener('click', () => {
  if (!topCard) return;
  showStamp('star', 1);
  setTimeout(() => { hideStamps(); flyOut('up'); }, 160);
});

$('btn-know').addEventListener('click', () => {
  if (!topCard) return;
  showStamp('know', 1);
  setTimeout(() => { hideStamps(); flyOut('right'); }, 160);
});

$('btn-back').addEventListener('click', () => showScreen('home'));

$('btn-retry').addEventListener('click', () => {
  if (results.nope.length === 0) {
    alert('다시 볼 단어가 없어요!\n모두 완벽하게 외웠네요 🎉');
    return;
  }
  currentWords = [...results.nope];
  currentIdx   = 0;
  results      = { know: [], nope: [], star: [] };
  updateProg();
  showScreen('swipe');
  renderCards();
});

$('btn-home').addEventListener('click', () => showScreen('home'));

// ================================================
// 화면 전환
// ================================================
function showScreen(name) {
  document.querySelectorAll('.screen')
    .forEach(s => s.classList.remove('active'));
  $(`screen-${name}`).classList.add('active');
}

// ================================================
// 시작
// ================================================
init();
