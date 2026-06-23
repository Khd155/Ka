/* طبقة التخزين المحلي (LocalStorage) - مسؤولة فقط عن القراءة/الكتابة */
const Storage = {
  KEYS: {
    QUIZ_STATE: 'chemQuiz_state',
    DARK_MODE: 'chemQuiz_darkMode'
  },

  saveQuizState(state) {
    localStorage.setItem(this.KEYS.QUIZ_STATE, JSON.stringify(state));
  },

  loadQuizState() {
    const raw = localStorage.getItem(this.KEYS.QUIZ_STATE);
    return raw ? JSON.parse(raw) : null;
  },

  clearQuizState() {
    localStorage.removeItem(this.KEYS.QUIZ_STATE);
  },

  saveDarkMode(isDark) {
    localStorage.setItem(this.KEYS.DARK_MODE, isDark ? '1' : '0');
  },

  loadDarkMode() {
    const raw = localStorage.getItem(this.KEYS.DARK_MODE);
    if (raw === null) return true; // الوضع الداكن هو الافتراضي
    return raw === '1';
  }
};
