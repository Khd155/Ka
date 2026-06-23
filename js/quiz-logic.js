/* طبقة منطق الاختبار (Logic) - لا تتعامل مع DOM إطلاقاً */
class QuizEngine {
  /**
   * @param {Array} questions - بنك الأسئلة الكامل المفلتر
   * @param {Object} [options]
   */
  constructor(questions, options = {}) {
    this.questions = questions;
    this.currentIndex = options.currentIndex || 0;
    this.answers = options.answers || {}; // { questionId: answerIndexOrBool }
    this.timerEnabled = !!options.timerEnabled;
    this.timerTotalSeconds = options.timerTotalSeconds || 0;
    this.timerRemainingSeconds = options.timerRemainingSeconds ?? this.timerTotalSeconds;
    this.finished = !!options.finished;
  }

  get total() {
    return this.questions.length;
  }

  getCurrentQuestion() {
    return this.questions[this.currentIndex];
  }

  isAnswered(index = this.currentIndex) {
    const q = this.questions[index];
    return q && this.answers[q.id] !== undefined;
  }

  recordAnswer(value) {
    const q = this.getCurrentQuestion();
    if (!q) return;
    this.answers[q.id] = value;
  }

  getAnswer(index = this.currentIndex) {
    const q = this.questions[index];
    return q ? this.answers[q.id] : undefined;
  }

  hasNext() {
    return this.currentIndex < this.total - 1;
  }

  hasPrev() {
    return this.currentIndex > 0;
  }

  goNext() {
    if (this.hasNext()) this.currentIndex++;
  }

  goPrev() {
    if (this.hasPrev()) this.currentIndex--;
  }

  goTo(index) {
    if (index >= 0 && index < this.total) this.currentIndex = index;
  }

  getAnsweredCount() {
    return this.questions.filter(q => this.answers[q.id] !== undefined).length;
  }

  isCorrect(question) {
    const userAnswer = this.answers[question.id];
    if (userAnswer === undefined) return false;
    return userAnswer === question.answer;
  }

  computeResults() {
    let correct = 0;
    const details = this.questions.map(q => {
      const userAnswer = this.answers[q.id];
      const ok = userAnswer !== undefined && userAnswer === q.answer;
      if (ok) correct++;
      return {
        question: q,
        userAnswer,
        isCorrect: ok,
        wasAnswered: userAnswer !== undefined
      };
    });
    const total = this.total;
    const wrong = total - correct;
    const percent = total > 0 ? Math.round((correct / total) * 100) : 0;
    return { correct, wrong, total, percent, details };
  }

  finish() {
    this.finished = true;
  }

  serialize() {
    return {
      questionIds: this.questions.map(q => q.id),
      currentIndex: this.currentIndex,
      answers: this.answers,
      timerEnabled: this.timerEnabled,
      timerTotalSeconds: this.timerTotalSeconds,
      timerRemainingSeconds: this.timerRemainingSeconds,
      finished: this.finished
    };
  }

  static fromSerialized(data, questionBank) {
    const byId = new Map(questionBank.map(q => [q.id, q]));
    const questions = data.questionIds.map(id => byId.get(id)).filter(Boolean);
    return new QuizEngine(questions, {
      currentIndex: data.currentIndex,
      answers: data.answers,
      timerEnabled: data.timerEnabled,
      timerTotalSeconds: data.timerTotalSeconds,
      timerRemainingSeconds: data.timerRemainingSeconds,
      finished: data.finished
    });
  }
}
