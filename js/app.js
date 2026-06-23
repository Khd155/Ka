/* نقطة التشغيل الرئيسية: تربط بين الـ Storage و QuizEngine و UI */
(function () {
  let questionBank = [];
  let engine = null;
  let timerInterval = null;
  let allChapters = [];
  let currentChapterIndex = 0;
  let currentChapterName = null;
  let quizMode = null; // 'chapter' أو 'all'

  let currentChapterMatchingQuestions = [];
  let currentMatchingAnswers = {};
  let currentNonMatchingResults = null;
  let globalAggregate = emptyResults();

  function emptyResults() {
    return { correct: 0, wrong: 0, total: 0, percent: 0, details: [] };
  }

  function combineResults(a, b) {
    const correct = a.correct + b.correct;
    const total = a.total + b.total;
    const wrong = total - correct;
    const percent = total > 0 ? Math.round((correct / total) * 100) : 0;
    return { correct, wrong, total, percent, details: [...a.details, ...b.details] };
  }

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
    if (saved && saved.engine && !saved.engine.finished) {
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
      UI.showScreen('chapterScreen');
      UI.populateChapters(allChapters, selectChapter);
    });

    UI.els.startAllBtn.addEventListener('click', () => {
      quizMode = 'all';
      currentChapterIndex = 0;
      globalAggregate = emptyResults();
      beginChapter(allChapters[0]);
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
        finishNonMatchingPhase();
      }
    });

    // زر إنهاء المزاوجة
    UI.els.matchingSubmitBtn.addEventListener('click', finishMatchingPhase);

    // أزرار المراجعة (للاختبار الشامل)
    UI.els.reviewWrongBtn.addEventListener('click', () => {
      UI.renderReview(globalAggregate.details, true);
    });
    UI.els.reviewAllBtn.addEventListener('click', () => {
      UI.renderReview(globalAggregate.details, false);
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
        beginChapter(allChapters[currentChapterIndex]);
      } else {
        // انتهت جميع الفصول
        Storage.clearQuizState();
        UI.els.resumeBtn.classList.add('hidden');
        UI.showScreen('startScreen');
        alert('تم إكمال جميع الفصول! شكراً لك على الاختبار.');
      }
    });

    UI.els.retakeChapterBtn.addEventListener('click', () => {
      beginChapter(allChapters[currentChapterIndex]);
    });

    UI.els.backToChaptersBtn.addEventListener('click', () => {
      UI.showScreen('chapterScreen');
      UI.populateChapters(allChapters, selectChapter);
    });
  }

  function selectChapter(chapterName) {
    quizMode = 'chapter';
    currentChapterIndex = allChapters.indexOf(chapterName);
    beginChapter(chapterName);
  }

  // يبدأ فصلاً معيّناً: اختيار متعدد ثم صح/خطأ، فالمزاوجة في النهاية
  function beginChapter(chapterName) {
    currentChapterName = chapterName;
    const chapterQuestions = questionBank.filter(q => q.chapter === chapterName);
    const nonMatching = [
      ...chapterQuestions.filter(q => q.type === 'mcq'),
      ...chapterQuestions.filter(q => q.type === 'tf')
    ];
    currentChapterMatchingQuestions = chapterQuestions.filter(q => q.type === 'matching');
    currentMatchingAnswers = {};
    currentNonMatchingResults = null;

    if (nonMatching.length === 0) {
      startMatchingPhase();
      return;
    }

    const timerEnabled = UI.els.timerToggle.checked;
    const minutes = parseInt(UI.els.timerMinutes.value, 10) || 30;
    const timerTotalSeconds = minutes * 60;

    engine = new QuizEngine(nonMatching, {
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
    quizMode = saved.quizMode;
    currentChapterName = saved.currentChapterName;
    currentChapterIndex = saved.currentChapterIndex;
    currentChapterMatchingQuestions = saved.matchingQuestionIds
      .map(id => questionBank.find(q => q.id === id))
      .filter(Boolean);
    currentMatchingAnswers = {};
    currentNonMatchingResults = null;
    globalAggregate = emptyResults();

    engine = QuizEngine.fromSerialized(saved.engine, questionBank);
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
        finishNonMatchingPhase();
      } else {
        persist();
      }
    }, 1000);
  }

  // تنتهي مرحلة الاختيار المتعدد/صح وخطأ، فتبدأ مرحلة المزاوجة (إن وُجدت) أو تُنهي الفصل مباشرة
  function finishNonMatchingPhase() {
    clearInterval(timerInterval);
    engine.finish();
    currentNonMatchingResults = engine.computeResults();
    Storage.clearQuizState();

    if (currentChapterMatchingQuestions.length > 0) {
      startMatchingPhase();
    } else {
      completeChapter(currentNonMatchingResults);
    }
  }

  function startMatchingPhase() {
    UI.showScreen('matchingScreen');
    UI.renderMatchingScreen(currentChapterName, currentChapterMatchingQuestions, currentMatchingAnswers);
  }

  function finishMatchingPhase() {
    const total = currentChapterMatchingQuestions.length;
    let correct = 0;
    const details = currentChapterMatchingQuestions.map(q => {
      const userAnswer = currentMatchingAnswers[q.id];
      const ok = userAnswer !== undefined && userAnswer === q.answer;
      if (ok) correct++;
      return { question: q, userAnswer, isCorrect: ok, wasAnswered: userAnswer !== undefined };
    });
    const matchingResults = {
      correct,
      wrong: total - correct,
      total,
      percent: total > 0 ? Math.round((correct / total) * 100) : 0,
      details
    };

    const combined = combineResults(currentNonMatchingResults || emptyResults(), matchingResults);
    completeChapter(combined);
  }

  // ينتهي الفصل بالكامل: يعرض نتيجة الفصل أو ينتقل للفصل التالي ضمن الاختبار الشامل
  function completeChapter(results) {
    if (quizMode === 'chapter') {
      UI.renderChapterResults(currentChapterName, results);
      UI.showScreen('chapterResultScreen');
    } else {
      globalAggregate = combineResults(globalAggregate, results);
      currentChapterIndex++;
      if (currentChapterIndex < allChapters.length) {
        beginChapter(allChapters[currentChapterIndex]);
      } else {
        UI.els.resumeBtn.classList.add('hidden');
        UI.renderResults(globalAggregate);
        UI.showScreen('resultScreen');
      }
    }
  }

  function persist() {
    if (!engine || engine.finished) return;
    Storage.saveQuizState({
      engine: engine.serialize(),
      quizMode,
      currentChapterName,
      currentChapterIndex,
      matchingQuestionIds: currentChapterMatchingQuestions.map(q => q.id)
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
