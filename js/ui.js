/* طبقة الواجهة (UI) - مسؤولة فقط عن العرض والتعامل مع DOM */
const UI = {
  els: {},

  cacheEls() {
    this.els = {
      startScreen: document.getElementById('startScreen'),
      quizScreen: document.getElementById('quizScreen'),
      resultScreen: document.getElementById('resultScreen'),

      totalQuestionsLabel: document.getElementById('totalQuestionsLabel'),
      chapterSelect: document.getElementById('chapterSelect'),
      timerToggle: document.getElementById('timerToggle'),
      timerInputWrap: document.getElementById('timerInputWrap'),
      timerMinutes: document.getElementById('timerMinutes'),
      startBtn: document.getElementById('startBtn'),
      resumeBtn: document.getElementById('resumeBtn'),

      questionCounter: document.getElementById('questionCounter'),
      timerDisplay: document.getElementById('timerDisplay'),
      progressBarFill: document.getElementById('progressBarFill'),
      chapterBadge: document.getElementById('chapterBadge'),
      questionText: document.getElementById('questionText'),
      questionImageWrap: document.getElementById('questionImageWrap'),
      questionImage: document.getElementById('questionImage'),
      optionsContainer: document.getElementById('optionsContainer'),
      prevBtn: document.getElementById('prevBtn'),
      nextBtn: document.getElementById('nextBtn'),
      finishBtn: document.getElementById('finishBtn'),

      scoreFraction: document.getElementById('scoreFraction'),
      scorePercent: document.getElementById('scorePercent'),
      correctCount: document.getElementById('correctCount'),
      wrongCount: document.getElementById('wrongCount'),
      reviewWrongBtn: document.getElementById('reviewWrongBtn'),
      reviewAllBtn: document.getElementById('reviewAllBtn'),
      retakeBtn: document.getElementById('retakeBtn'),
      reviewContainer: document.getElementById('reviewContainer'),

      darkModeToggle: document.getElementById('darkModeToggle')
    };
  },

  showScreen(name) {
    ['startScreen', 'quizScreen', 'resultScreen'].forEach(key => {
      this.els[key].classList.toggle('active', key === name);
    });
  },

  populateChapters(chapters) {
    const select = this.els.chapterSelect;
    select.innerHTML = '<option value="all">جميع الفصول</option>';
    chapters.forEach(ch => {
      const opt = document.createElement('option');
      opt.value = ch;
      opt.textContent = ch;
      select.appendChild(opt);
    });
  },

  setTotalQuestionsLabel(count) {
    this.els.totalQuestionsLabel.textContent = count;
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
  },

  updateProgressBar(engine) {
    const pct = ((engine.currentIndex + 1) / engine.total) * 100;
    this.els.progressBarFill.style.width = `${pct}%`;
  },

  updateNavButtons(engine) {
    this.els.prevBtn.disabled = !engine.hasPrev();
    this.els.nextBtn.textContent = engine.hasNext() ? 'التالي' : 'الأخير';
    this.els.nextBtn.disabled = !engine.hasNext();
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
  },

  renderReview(details, onlyWrong) {
    const list = onlyWrong ? details.filter(d => !d.isCorrect) : details;
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
