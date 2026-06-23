/* نقطة التشغيل الرئيسية: تربط بين الـ Storage و QuizEngine و UI */
(function () {
  let questionBank = [];
  let engine = null;
  let timerInterval = null;
  let allChapters = [];
  let currentChapterIndex = 0;
  let quizMode = null; // 'chapter' أو 'all'

  function init() {
    UI.cacheEls();
    initDarkMode();

    fetch('data/questions.json')
      .then(res => res.json())
      .then(data => {
        questionBank = data;
        allChapters = [...new Set(questionBank.map(q => q.chapter))];
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
    // تبديل حقل المؤقت
    UI.els.timerToggle.addEventListener('change', () => {
      UI.els.timerInputWrap.classList.toggle('hidden', !UI.els.timerToggle.checked);
    });

    // أزرار البداية
    UI.els.startByChapterBtn.addEventListener('click', () => {
      quizMode = 'chapter';
      currentChapterIndex = 0;
      UI.showScreen('chapterScreen');
      UI.populateChapters(allChapters, startChapterQuiz);
    });

    UI.els.startAllBtn.addEventListener('click', () => {
      quizMode = 'all';
      startAllQuiz();
    });

    UI.els.resumeBtn.addEventListener('click', resumeQuiz);

    // العودة من شاشة الفصول
    UI.els.backFromChaptersBtn.addEventListener('click', () => {
      UI.showScreen('startScreen');
    });

    // أزرار الاختبار
    UI.els.prevBtn.addEventListener('click', () => {
      engine.goPrev();
      renderCurrent();
    });
    UI.els.nextBtn.addEventListener('click', () => {
      if (engine.hasNext()) {
        engine.goNext();
        renderCurrent();
      } else {
        finishCurrentQuiz();
      }
    });

    // أزرار المراجعة
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

    // أزرار نتائج الفصل
    UI.els.nextChapterBtn.addEventListener('click', () => {
      currentChapterIndex++;
      if (currentChapterIndex < allChapters.length) {
        startChapterQuiz(allChapters[currentChapterIndex]);
      } else {
        // انتهت جميع الفصول
        Storage.clearQuizState();
        UI.els.resumeBtn.classList.add('hidden');
        UI.showScreen('startScreen');
        alert('تم إكمال جميع الفصول! شكراً لك على الاختبار.');
      }
    });

    UI.els.retakeChapterBtn.addEventListener('click', () => {
      startChapterQuiz(allChapters[currentChapterIndex]);
    });

    UI.els.backToChaptersBtn.addEventListener('click', () => {
      UI.showScreen('chapterScreen');
      UI.populateChapters(allChapters, startChapterQuiz);
    });
  }

  // نظام الترتيب: MCQ أولاً، ثم TF، ثم Matching
  function getOrderedChapterQuestions(chapterName) {
    const chapterQuestions = questionBank.filter(q => q.chapter === chapterName);
    const mcq = chapterQuestions.filter(q => q.type === 'mcq');
    const tf = chapterQuestions.filter(q => q.type === 'tf');
    const matching = chapterQuestions.filter(q => q.type === 'matching');
    return [...mcq, ...tf, ...matching];
  }

  function startChapterQuiz(chapterName) {
    const questions = getOrderedChapterQuestions(chapterName);
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

  function startAllQuiz() {
    if (questionBank.length === 0) {
      alert('لا توجد أسئلة متاحة.');
      return;
    }

    const timerEnabled = UI.els.timerToggle.checked;
    const minutes = parseInt(UI.els.timerMinutes.value, 10) || 30;
    const timerTotalSeconds = minutes * 60;

    engine = new QuizEngine(questionBank, {
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
        finishCurrentQuiz();
      } else {
        persist();
      }
    }, 1000);
  }

  function finishCurrentQuiz() {
    clearInterval(timerInterval);
    engine.finish();
    const results = engine.computeResults();
    Storage.clearQuizState();

    if (quizMode === 'chapter') {
      // عرض نتائج الفصل
      UI.renderChapterResults(allChapters[currentChapterIndex], results);
      UI.showScreen('chapterResultScreen');
    } else {
      // عرض النتائج النهائية (اختبار شامل)
      UI.els.resumeBtn.classList.add('hidden');
      UI.renderResults(results);
      UI.showScreen('resultScreen');
    }
  }

  function persist() {
    if (!engine || engine.finished) return;
    Storage.saveQuizState(engine.serialize());
  }

  document.addEventListener('DOMContentLoaded', init);
})();
