/* طبقة الواجهة (UI) - مسؤولة فقط عن العرض والتعامل مع DOM */
const UI = {
  els: {},

  cacheEls() {
    this.els = {
      startScreen: document.getElementById('startScreen'),
      chapterScreen: document.getElementById('chapterScreen'),
      quizScreen: document.getElementById('quizScreen'),
      matchingScreen: document.getElementById('matchingScreen'),
      chapterResultScreen: document.getElementById('chapterResultScreen'),
      resultScreen: document.getElementById('resultScreen'),

      timerToggle: document.getElementById('timerToggle'),
      timerInputWrap: document.getElementById('timerInputWrap'),
      timerMinutes: document.getElementById('timerMinutes'),
      startByChapterBtn: document.getElementById('startByChapterBtn'),
      startAllBtn: document.getElementById('startAllBtn'),
      resumeBtn: document.getElementById('resumeBtn'),

      chaptersGrid: document.getElementById('chaptersGrid'),
      backFromChaptersBtn: document.getElementById('backFromChaptersBtn'),

      questionCounter: document.getElementById('questionCounter'),
      timerDisplay: document.getElementById('timerDisplay'),
      progressBarFill: document.getElementById('progressBarFill'),
      chapterBadge: document.getElementById('chapterBadge'),
      questionText: document.getElementById('questionText'),
      questionImageWrap: document.getElementById('questionImageWrap'),
      questionImage: document.getElementById('questionImage'),
      optionsContainer: document.getElementById('optionsContainer'),
      questionCardInner: document.getElementById('questionCardInner'),
      prevBtn: document.getElementById('prevBtn'),
      nextBtn: document.getElementById('nextBtn'),

      scoreFraction: document.getElementById('scoreFraction'),
      scorePercent: document.getElementById('scorePercent'),
      correctCount: document.getElementById('correctCount'),
      wrongCount: document.getElementById('wrongCount'),
      reviewWrongBtn: document.getElementById('reviewWrongBtn'),
      reviewAllBtn: document.getElementById('reviewAllBtn'),
      retakeBtn: document.getElementById('retakeBtn'),
      reviewContainer: document.getElementById('reviewContainer'),

      chapterResultTitle: document.getElementById('chapterResultTitle'),
      chapterScoreFraction: document.getElementById('chapterScoreFraction'),
      chapterScorePercent: document.getElementById('chapterScorePercent'),
      chapterCorrectCount: document.getElementById('chapterCorrectCount'),
      chapterWrongCount: document.getElementById('chapterWrongCount'),
      nextChapterBtn: document.getElementById('nextChapterBtn'),
      retakeChapterBtn: document.getElementById('retakeChapterBtn'),
      backToChaptersBtn: document.getElementById('backToChaptersBtn'),
      chapterReviewWrongBtn: document.getElementById('chapterReviewWrongBtn'),
      chapterReviewAllBtn: document.getElementById('chapterReviewAllBtn'),
      chapterReviewContainer: document.getElementById('chapterReviewContainer'),

      matchingSummary: document.getElementById('matchingSummary'),

      darkModeToggle: document.getElementById('darkModeToggle'),

      matchingProgress: document.getElementById('matchingProgress'),
      matchingChapterBadge: document.getElementById('matchingChapterBadge'),
      matchingTerms: document.getElementById('matchingTerms'),
      matchingBank: document.getElementById('matchingBank'),
      matchingSubmitBtn: document.getElementById('matchingSubmitBtn')
    };
  },

  showScreen(name) {
    ['startScreen', 'chapterScreen', 'quizScreen', 'matchingScreen', 'chapterResultScreen', 'resultScreen'].forEach(key => {
      const isActive = key === name;
      this.els[key].classList.toggle('active', isActive);
      if (isActive) {
        this.els[key].classList.remove('fade-in');
        void this.els[key].offsetWidth;
        this.els[key].classList.add('fade-in');
      }
    });
  },

  populateChapters(chapters, onChapterSelect) {
    this.els.chaptersGrid.innerHTML = '';
    chapters.forEach(ch => {
      const btn = document.createElement('button');
      btn.className = 'chapter-btn';
      btn.innerHTML = `
        <h3>${ch}</h3>
        <div class="chapter-stats">
          <span>اضغط للبدء</span>
        </div>
      `;
      btn.addEventListener('click', () => onChapterSelect(ch));
      this.els.chaptersGrid.appendChild(btn);
    });
  },

  setDarkMode(isDark) {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    this.els.darkModeToggle.textContent = isDark ? '☀️' : '🌙';
  },

  renderQuestion(engine, onOptionSelected) {
    const q = engine.getCurrentQuestion();
    if (!q) return;

    this.els.questionCounter.textContent = `${engine.currentIndex + 1} من ${engine.total}`;
    this.els.chapterBadge.textContent = q.chapter;
    this.els.questionText.textContent = q.question;

    if (q.image) {
      this.els.questionImage.src = q.image;
      this.els.questionImageWrap.classList.remove('hidden');
    } else {
      this.els.questionImageWrap.classList.add('hidden');
    }

    const userAnswer = engine.getAnswer();
    const container = this.els.optionsContainer;
    container.innerHTML = '';

    if (q.type === 'mcq') {
      container.className = 'options-container';
      q.options.forEach((optText, idx) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = optText;
        if (userAnswer === idx) btn.classList.add('selected');
        btn.addEventListener('click', () => onOptionSelected(idx));
        container.appendChild(btn);
      });
    } else {
      container.className = 'options-container tf-options';
      [{ label: 'صحيح', value: true }, { label: 'خطأ', value: false }].forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = opt.label;
        if (userAnswer === opt.value) btn.classList.add('selected');
        btn.addEventListener('click', () => onOptionSelected(opt.value));
        container.appendChild(btn);
      });
    }

    this.updateProgressBar(engine);
    this.updateNavButtons(engine);
    this.replayTransition();
  },

  replayTransition() {
    const el = this.els.questionCardInner;
    if (!el) return;
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
  },

  updateProgressBar(engine) {
    const pct = ((engine.currentIndex + 1) / engine.total) * 100;
    this.els.progressBarFill.style.width = `${pct}%`;
  },

  updateNavButtons(engine) {
    this.els.prevBtn.disabled = !engine.hasPrev();
    this.els.nextBtn.textContent = engine.hasNext() ? 'التالي' : 'إنهاء';
    this.els.nextBtn.disabled = !engine.isAnswered();
  },

  shuffleIndices(n) {
    const arr = Array.from({ length: n }, (_, i) => i);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  },

  renderMatchingScreen(chapterName, questions, answers) {
    this.els.matchingChapterBadge.textContent = chapterName;
    this.updateMatchingProgress(questions, answers);

    const termsCol = this.els.matchingTerms;
    const bankCol = this.els.matchingBank;
    termsCol.innerHTML = '';
    bankCol.innerHTML = '';

    const bank = questions[0] ? questions[0].options : [];
    let selectedWordEl = null;
    const wordEls = [];

    const setWordUsed = (idx, used) => {
      const el = wordEls[idx];
      if (!el) return;
      el.classList.toggle('used', used);
      el.draggable = !used;
      if (used && selectedWordEl === el) {
        el.classList.remove('active');
        selectedWordEl = null;
      }
    };

    const assign = (qid, idx, slotEl) => {
      const prevIdx = answers[qid];
      if (prevIdx !== undefined) setWordUsed(prevIdx, false);
      answers[qid] = idx;
      slotEl.textContent = bank[idx];
      slotEl.classList.add('filled');
      setWordUsed(idx, true);
      this.updateMatchingProgress(questions, answers);
    };

    const clearSlot = (qid, slotEl) => {
      const prevIdx = answers[qid];
      if (prevIdx !== undefined) setWordUsed(prevIdx, false);
      delete answers[qid];
      slotEl.textContent = 'اضغط أو اسحب الإجابة هنا';
      slotEl.classList.remove('filled');
      this.updateMatchingProgress(questions, answers);
    };

    questions.forEach((q, qIdx) => {
      const row = document.createElement('div');
      row.className = 'matching-row';

      const term = document.createElement('div');
      term.className = 'matching-term';
      term.textContent = `${qIdx + 1}. ${q.question}`;
      row.appendChild(term);

      const slot = document.createElement('div');
      slot.className = 'matching-slot';
      const isFilled = answers[q.id] !== undefined;
      slot.textContent = isFilled ? bank[answers[q.id]] : 'اضغط أو اسحب الإجابة هنا';
      slot.classList.toggle('filled', isFilled);

      slot.addEventListener('dragover', e => e.preventDefault());
      slot.addEventListener('drop', e => {
        e.preventDefault();
        const idx = parseInt(e.dataTransfer.getData('text/plain'), 10);
        if (Number.isNaN(idx)) return;
        const el = wordEls[idx];
        if (el && el.classList.contains('used') && answers[q.id] !== idx) return;
        assign(q.id, idx, slot);
      });
      slot.addEventListener('click', () => {
        if (slot.classList.contains('filled')) {
          clearSlot(q.id, slot);
          return;
        }
        if (selectedWordEl) {
          const wordEl = selectedWordEl;
          const idx = parseInt(wordEl.dataset.idx, 10);
          assign(q.id, idx, slot);
          wordEl.classList.remove('active');
          selectedWordEl = null;
        }
      });

      row.appendChild(slot);
      termsCol.appendChild(row);
    });

    this.shuffleIndices(bank.length).forEach(idx => {
      const word = bank[idx];
      const wordEl = document.createElement('div');
      wordEl.className = 'matching-word';
      wordEl.draggable = true;
      wordEl.dataset.idx = idx;
      wordEl.textContent = word;
      wordEls[idx] = wordEl;

      wordEl.addEventListener('dragstart', e => {
        if (wordEl.classList.contains('used')) {
          e.preventDefault();
          return;
        }
        e.dataTransfer.setData('text/plain', idx);
      });
      wordEl.addEventListener('click', () => {
        if (wordEl.classList.contains('used')) return;
        if (selectedWordEl === wordEl) {
          wordEl.classList.remove('active');
          selectedWordEl = null;
          return;
        }
        if (selectedWordEl) selectedWordEl.classList.remove('active');
        selectedWordEl = wordEl;
        wordEl.classList.add('active');
      });

      bankCol.appendChild(wordEl);
    });

    Object.values(answers).forEach(idx => setWordUsed(idx, true));
  },

  updateMatchingProgress(questions, answers) {
    const answeredCount = questions.filter(q => answers[q.id] !== undefined).length;
    this.els.matchingProgress.textContent = `${answeredCount} / ${questions.length}`;
  },

  setTimerDisplay(seconds, visible) {
    this.els.timerDisplay.classList.toggle('hidden', !visible);
    if (!visible) return;
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    this.els.timerDisplay.textContent = `${m}:${s}`;
    this.els.timerDisplay.classList.toggle('low-time', seconds <= 60);
  },

  renderResults(results) {
    this.els.scoreFraction.textContent = `${results.correct} / ${results.total}`;
    this.els.scorePercent.textContent = `${results.percent}%`;
    this.els.correctCount.textContent = results.correct;
    this.els.wrongCount.textContent = results.wrong;
    this.els.reviewContainer.innerHTML = '';
    this.els.reviewContainer.classList.add('hidden');
    document.getElementById('resultRing').style.setProperty('--pct', results.percent);

    const matchingDetails = (results.details || []).filter(d => d.question.type === 'matching');
    if (matchingDetails.length > 0) {
      const correct = matchingDetails.filter(d => d.isCorrect).length;
      this.els.matchingSummary.textContent = `نتيجة المزاوجة: ${correct} / ${matchingDetails.length} صحيحة`;
      this.els.matchingSummary.classList.remove('hidden');
    } else {
      this.els.matchingSummary.classList.add('hidden');
    }
  },

  renderChapterResults(chapterName, results) {
    this.els.chapterResultTitle.textContent = `نتيجة: ${chapterName}`;
    this.els.chapterScoreFraction.textContent = `${results.correct} / ${results.total}`;
    this.els.chapterScorePercent.textContent = `${results.percent}%`;
    this.els.chapterCorrectCount.textContent = results.correct;
    this.els.chapterWrongCount.textContent = results.wrong;
    document.getElementById('chapterResultRing').style.setProperty('--pct', results.percent);
    this.els.chapterReviewContainer.innerHTML = '';
    this.els.chapterReviewContainer.classList.add('hidden');
  },

  renderChapterReview(details, onlyWrong) {
    const nonMatching = details.filter(d => d.question.type !== 'matching');
    const list = onlyWrong ? nonMatching.filter(d => !d.isCorrect) : nonMatching;
    const container = this.els.chapterReviewContainer;
    container.innerHTML = '';

    if (list.length === 0) {
      const p = document.createElement('p');
      p.textContent = 'لا توجد إجابات خاطئة. أحسنت!';
      container.appendChild(p);
    }

    list.forEach((d, i) => {
      const item = document.createElement('div');
      item.className = 'review-item';

      const qTitle = document.createElement('div');
      qTitle.className = 'review-q';
      qTitle.textContent = `${i + 1}. ${d.question.question}`;
      item.appendChild(qTitle);

      if (d.question.image) {
        const img = document.createElement('img');
        img.src = d.question.image;
        img.className = 'review-image';
        item.appendChild(img);
      }

      const userText = this.formatAnswer(d.question, d.userAnswer);
      const correctText = this.formatAnswer(d.question, d.question.answer);

      const userRow = document.createElement('div');
      userRow.className = 'review-answer-row';
      userRow.innerHTML = `إجابتك: <span class="${d.isCorrect ? 'label-correct' : 'label-wrong'}">${userText}</span>`;
      item.appendChild(userRow);

      if (!d.isCorrect) {
        const correctRow = document.createElement('div');
        correctRow.className = 'review-answer-row';
        correctRow.innerHTML = `الإجابة الصحيحة: <span class="label-correct">${correctText}</span>`;
        item.appendChild(correctRow);
      }

      container.appendChild(item);
    });

    container.classList.remove('hidden');
  },

  renderReview(details, onlyWrong) {
    const nonMatching = details.filter(d => d.question.type !== 'matching');
    const list = onlyWrong ? nonMatching.filter(d => !d.isCorrect) : nonMatching;
    const container = this.els.reviewContainer;
    container.innerHTML = '';

    if (list.length === 0) {
      const p = document.createElement('p');
      p.textContent = 'لا توجد إجابات خاطئة. أحسنت!';
      container.appendChild(p);
    }

    list.forEach((d, i) => {
      const item = document.createElement('div');
      item.className = 'review-item';

      const qTitle = document.createElement('div');
      qTitle.className = 'review-q';
      qTitle.textContent = `${i + 1}. ${d.question.question}`;
      item.appendChild(qTitle);

      if (d.question.image) {
        const img = document.createElement('img');
        img.src = d.question.image;
        img.className = 'review-image';
        item.appendChild(img);
      }

      const userText = this.formatAnswer(d.question, d.userAnswer);
      const correctText = this.formatAnswer(d.question, d.question.answer);

      const userRow = document.createElement('div');
      userRow.className = 'review-answer-row';
      userRow.innerHTML = `إجابتك: <span class="${d.isCorrect ? 'label-correct' : 'label-wrong'}">${userText}</span>`;
      item.appendChild(userRow);

      if (!d.isCorrect) {
        const correctRow = document.createElement('div');
        correctRow.className = 'review-answer-row';
        correctRow.innerHTML = `الإجابة الصحيحة: <span class="label-correct">${correctText}</span>`;
        item.appendChild(correctRow);
      }

      container.appendChild(item);
    });

    container.classList.remove('hidden');
  },

  formatAnswer(question, value) {
    if (value === undefined) return 'لم تتم الإجابة';
    if (question.type === 'tf') return value ? 'صحيح' : 'خطأ';
    return question.options[value] ?? 'لم تتم الإجابة';
  }
};
