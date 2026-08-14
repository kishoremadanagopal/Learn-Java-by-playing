(function(){
    const TOPIC = window.TOPIC;
    if(!TOPIC){ console.error('game.js: window.TOPIC is not defined'); return; }
    const BANK = TOPIC.bank;
    const STORAGE_KEY = 'javaquest_best_' + TOPIC.slug;

   const CUP_SVG = '<svg class="cup" viewBox="0 0 24 24" fill="currentColor"><path d="M4 3h13v9a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V3z"/><path d="M17 7h2a3 3 0 0 1 0 6h-2V7z" fill="none" stroke="currentColor" stroke-width="2"/><rect x="3" y="19" width="15" height="2" rx="1"/></svg>';

   let deck = [];
    let idx = 0;
    let score = 0;
    let streak = 0;
    let lives = 3;
    let level = 1;
    let timerId = null;
    let timeLeft = 0;
    let timerMax = 0;
    let best = Number(localStorage.getItem(STORAGE_KEY) || 0);
    let gameOver = false;
    let locked = false;
    let missed = [];

   const el = id => document.getElementById(id);
    const livesEl = el('lives'), scoreEl = el('score'), streakEl = el('streak'), bestEl = el('best');
    const promptEl = el('prompt'), codeEl = el('code'), answerEl = el('answer'), errorEl = el('error-msg');
    const consoleEl = el('console'), levelPill = el('level-pill'), filenameEl = el('filename');
    const timerTrack = el('timer-track'), timerFill = el('timer-fill');
    const editorEl = el('editor'), gameArea = el('game-area'), overlay = el('overlay');
    const submitBtn = el('submit-btn'), hintBtn = el('hint-btn'), skipBtn = el('skip-btn'), restartBtn = el('restart-btn');

   bestEl.textContent = best;

   function shuffle(arr){
         const a = arr.slice();
         for(let i=a.length-1;i>0;i--){
                 const j = Math.floor(Math.random()*(i+1));
                 [a[i],a[j]]=[a[j],a[i]];
         }
         return a;
   }

   function buildDeck(){
         const l1 = shuffle(BANK.filter(q=>q.lvl===1));
         const l2 = shuffle(BANK.filter(q=>q.lvl===2));
         const l3 = shuffle(BANK.filter(q=>q.lvl===3));
         deck = l1.concat(l2, l3, shuffle(BANK));
   }

   function escapeHtml(s){
         return String(s)
           .replace(/&/g, '&amp;')
           .replace(/</g, '&lt;')
           .replace(/>/g, '&gt;')
           .replace(/"/g, '&quot;');
   }

   function recordMiss(q){
         const key = q.prompt + '|' + q.blank;
         if(missed.some(m => m.key === key)) return;
         missed.push({
                 key,
                 prompt: q.prompt,
                 code: q.before + q.blank + q.after,
                 blank: q.blank,
                 hint: q.hint
         });
   }

   function log(msg, cls){
         const line = document.createElement('div');
         if(cls) line.className = cls;
         line.textContent = msg;
         consoleEl.appendChild(line);
         consoleEl.scrollTop = consoleEl.scrollHeight;
   }

   function renderLives(){
         livesEl.innerHTML = '';
         for(let i=0;i<3;i++){
                 const wrap = document.createElement('span');
                 wrap.innerHTML = CUP_SVG;
                 const svg = wrap.firstElementChild;
                 svg.classList.toggle('on', i < lives);
                 livesEl.appendChild(svg);
         }
   }

   function currentTimerDuration(){
         if(level <= 1) return 0;
         if(level === 2) return 16000;
         return 11000;
   }

   function startTimer(){
         clearInterval(timerId);
         timerMax = currentTimerDuration();
         if(timerMax === 0){
                 timerTrack.classList.remove('active');
                 return;
         }
         timerTrack.classList.add('active');
         timeLeft = timerMax;
         timerFill.style.background = 'var(--amber)';
         timerFill.style.width = '100%';
         timerId = setInterval(()=>{
                 timeLeft -= 100;
                 const pct = Math.max(0, (timeLeft/timerMax)*100);
                 timerFill.style.width = pct + '%';
                 if(pct < 25) timerFill.style.background = 'var(--red)';
                 if(timeLeft <= 0){
                           clearInterval(timerId);
                           handleTimeout();
                 }
         }, 100);
   }

   function stopTimer(){ clearInterval(timerId); }

   function renderQuestion(){
         if(gameOver) return;
         if(idx >= deck.length){
                 deck = deck.concat(shuffle(BANK));
         }
         const q = deck[idx];
         level = q.lvl;
         levelPill.textContent = 'Level ' + level;
         filenameEl.textContent = q.file || (TOPIC.fileBase || 'Main') + '.java';
         const needsMore = /[.(]/.test(q.blank);
         promptEl.textContent = q.prompt + (needsMore ? '  (the answer is more than one bare word)' : '');
         codeEl.textContent = q.before + '____' + q.after;
         answerEl.value = '';
         errorEl.textContent = '';
         locked = false;
         answerEl.disabled = false;
         submitBtn.disabled = false;
         hintBtn.disabled = false;
         skipBtn.disabled = false;
         answerEl.focus();
         startTimer();
   }

   function updateStats(){
         scoreEl.textContent = score;
         streakEl.textContent = streak;
         renderLives();
   }

   function pointsFor(q){
         const base = q.lvl === 1 ? 10 : q.lvl === 2 ? 20 : 35;
         const mult = 1 + Math.min(streak, 8) * 0.15;
         return Math.round(base * mult);
   }

   function lockInput(){
         locked = true;
         answerEl.disabled = true;
         submitBtn.disabled = true;
         hintBtn.disabled = true;
         skipBtn.disabled = true;
   }

   function correctAnswer(){
         lockInput();
         stopTimer();
         const q = deck[idx];
         const pts = pointsFor(q);
         score += pts;
         streak += 1;
         updateStats();
         editorEl.classList.remove('shake');
         editorEl.classList.add('flash-ok');
         setTimeout(()=>editorEl.classList.remove('flash-ok'), 400);
         log('BUILD SUCCESSFUL  +' + pts + (streak>1 ? '  (streak x' + streak + ')' : ''), 'ok');
         if(streak > 0 && streak % 5 === 0){
                 log('level up — difficulty increasing', 'lvl');
         }
         advance();
   }

   function wrongAnswer(reasonPrefix){
         if(locked || gameOver) return;
         lockInput();
         stopTimer();
         const q = deck[idx];
         recordMiss(q);
         streak = 0;
         lives -= 1;
         updateStats();
         editorEl.classList.remove('flash-ok');
         editorEl.classList.add('shake');
         setTimeout(()=>editorEl.classList.remove('shake'), 350);
         log((reasonPrefix || 'error:') + ' expected `' + q.blank + '`', 'err');
         if(lives <= 0){
                 endGame();
         } else {
                 advance();
         }
   }

   function handleTimeout(){ wrongAnswer('error: timed out —'); }

   function advance(){
         if(gameOver) return;
         idx += 1;
         setTimeout(renderQuestion, 700);
   }

   function checkAnswer(){
         if(locked || gameOver) return;
         const val = answerEl.value.trim();
         if(!val){
                 errorEl.textContent = 'Type an answer first';
                 return;
         }
         errorEl.textContent = '';
         const q = deck[idx];
         const normalize = s => s.replace(/\s+/g,' ').replace(/;$/,'').trim();
         if(normalize(val) === normalize(q.blank)){
                 correctAnswer();
         } else {
                 wrongAnswer();
         }
   }

   function renderReview(){
         let container = document.getElementById('review-list');
         if(!container){
                 container = document.createElement('div');
                 container.id = 'review-list';
                 restartBtn.parentNode.insertBefore(container, restartBtn);
         }
         if(missed.length === 0){
                 container.innerHTML = '<p class="review-empty">No misses this run — clean sweep.</p>';
                 return;
         }
         container.innerHTML = '<div class="review-heading">Review (' + missed.length + ')</div>' +
                 missed.map(m => (
                           '<div class="review-item">' +
                             '<div class="review-prompt">' + escapeHtml(m.prompt) + '</div>' +
                             '<pre class="review-code">' + escapeHtml(m.code) + '</pre>' +
                             '<div class="review-hint">' + escapeHtml(m.hint) + '</div>' +
                           '</div>'
                         )).join('');
   }

   function endGame(){
         gameOver = true;
         lockInput();
         stopTimer();
         gameArea.classList.add('hidden');
         overlay.classList.add('show');
         el('overlay-title').textContent = 'Build failed';
         el('overlay-score').textContent = score;
         if(score > best){
                 best = score;
                 localStorage.setItem(STORAGE_KEY, String(best));
                 el('overlay-sub').textContent = 'new best score';
         } else {
                 el('overlay-sub').textContent = 'best: ' + best;
         }
         bestEl.textContent = best;
         renderReview();
   }

   function newGame(){
         score = 0; streak = 0; lives = 3; level = 1; idx = 0;
         gameOver = false; locked = false;
         missed = [];
         buildDeck();
         updateStats();
         consoleEl.innerHTML = '';
         log('compiling ' + TOPIC.title.toLowerCase() + '...', 'lvl');
         log('build ready — good luck', 'ok');
         overlay.classList.remove('show');
         gameArea.classList.remove('hidden');
         renderQuestion();
   }

   submitBtn.addEventListener('click', checkAnswer);
    answerEl.addEventListener('keydown', e => { if(e.key === 'Enter') checkAnswer(); });
    answerEl.addEventListener('input', () => { errorEl.textContent = ''; });
    hintBtn.addEventListener('click', () => log('hint: ' + deck[idx].hint));
    skipBtn.addEventListener('click', () => {
          if(locked || gameOver) return;
          recordMiss(deck[idx]);
          log('skipped — answer was `' + deck[idx].blank + '`');
          streak = 0;
          updateStats();
          advance();
    });
    restartBtn.addEventListener('click', newGame);

   newGame();
})();
