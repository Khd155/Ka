/* نقطة التشغيل الرئيسية: تربط بين الـ Storage و QuizEngine و UI */
(function () {
  let questionBank = [];
  let engine = null;
  let timerInterval = null;

  function init() {
    UI.cacheEls();
    initDarkMode();

    fetch('data/questions.json')
      .then(res => res.json())
      .then(data => {
        questionBank = data;
        UI.setTotalQuestionsLabel(questionBank.length);
        const chapters = [...new Set(questionBank.map(q => q.chapter))];
        UI.populateChapters(chapters);
        checkForSavedQuiz();
      })
      .catch(err => {
        console.error('فشل تحميل ملف الأسئلة:', err);
        alert('تعذر تحميل ملف الأسئلة. تأكد من تشغيل الموقع عبر خادم محلي (راجع README).');
      });

    bindStaticEvents();
  }

  function initDarkMode() {
    const isDark = Storage.loadDarkMode();
    UI.setDarkMode(isDark);
    UI.els.darkModeToggle.addEventListener('click', () => {
      const newVal = document.documentElement.getAttribute('data-theme') !== 'dark';
      UI.setDarkMode(newVal);
      Storage.saveDarkMode(newVal);
    });
  }

  function checkForSavedQuiz() {
    const saved = Storage.loadQuizState();
    if (saved && !saved.finished) {
      UI.els.resumeBtn.classList.remove('hidden');
    }
  }

  function bindStaticEvents() {
    UI.els.timerToggle.addEventListener('change', () => {
      UI.els.timerInputWrap.classList.toggle('hidden', !UI.els.timerToggle.checked);
    });

    UI.els.startBtn.addEventListener('click', startNewQuiz);
    UI.els.resumeBtn.addEventListener('click', resumeQuiz);
    UI.els.prevBtn.addEventListener('click', () => { engine.goPrev(); renderCurrent(); });
    UI.els.nextBtn.addEventListener('click', () => { engine.goNext(); renderCurrent(); });
    UI.els.finishBtn.addEventListener('click', finishQuiz);

    UI.els.reviewWrongBtn.addEventListener('click', () => {
      const results = engine.computeResults();
      UI.renderReview(results.details, true);
    });
    UI.els.reviewAllBtn.addEventListener('click', () => {
      const results = engine.computeResults();
      UI.renderReview(results.details, false);
    });
    UI.els.retakeBtn.addEventListener('click', () => {
      Storage.clearQuizState();
      UI.els.resumeBtn.classList.add('hidden');
      UI.showScreen('startScreen');
    });
  }

  function getFilteredQuestions() {
    const chapter = UI.els.chapterSelect.value;
    const pool = chapter === 'all' ? questionBank : questionBank.filter(q => q.chapter === chapter);
    return pool;
  }

  function startNewQuiz() {
    const questions = getFilteredQuestions();
    if (questions.length === 0) {
      alert('لا توجد أسئلة لهذا الفصل.');
      return;
    }

    const timerEnabled = UI.els.timerToggle.checked;
    const minutes = parseInt(UI.els.timerMinutes.value, 10) || 30;
    const timerTotalSeconds = minutes * 60;

    engine = new QuizEngine(questions, {
      timerEnabled,
      timerTotalSeconds,
      timerRemainingSeconds: timerTotalSeconds
    });

    persist();
    startTimerIfNeeded();
    UI.showScreen('quizScreen');
    renderCurrent();
  }

  function resumeQuiz() {
    const saved = Storage.loadQuizState();
    if (!saved) return;
    engine = QuizEngine.fromSerialized(saved, questionBank);
    startTimerIfNeeded();
    UI.showScreen('quizScreen');
    renderCurrent();
  }

  function renderCurrent() {
    UI.renderQuestion(engine, handleOptionSelected);
    UI.setTimerDisplay(engine.timerRemainingSeconds, engine.timerEnabled);
    persist();
  }

  function handleOptionSelected(value) {
    engine.recordAnswer(value);
    renderCurrent();
  }

  function startTimerIfNeeded() {
    clearInterval(timerInterval);
    if (!engine.timerEnabled) return;
    UI.setTimerDisplay(engine.timerRemainingSeconds, true);
    timerInterval = setInterval(() => {
      engine.timerRemainingSeconds--;
      UI.setTimerDisplay(engine.timerRemainingSeconds, true);
      if (engine.timerRemainingSeconds <= 0) {
        clearInterval(timerInterval);
        finishQuiz();
      } else {
        persist();
      }
    }, 1000);
  }

  function finishQuiz() {
    clearInterval(timerInterval);
    engine.finish();
    const results = engine.computeResults();
    Storage.clearQuizState();
    UI.els.resumeBtn.classList.add('hidden');
    UI.renderResults(results);
    UI.showScreen('resultScreen');
  }

  function persist() {
    if (!engine || engine.finished) return;
    Storage.saveQuizState(engine.serialize());
  }

  document.addEventListener('DOMContentLoaded', init);
})();
