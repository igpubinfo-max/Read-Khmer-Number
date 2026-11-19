/**
 * Khmer Amount to Words Converter (កម្មវិធីបម្លែងចំនួនទឹកប្រាក់ជាអក្សរខ្មែរ)
 * Compatible with modern Android web, PWA and offline use.
 */

class KhmerAmountConverter {
  static DIGITS = ['សូន្យ', 'មួយ', 'ពីរ', 'បី', 'បួន', 'ប្រាំ', 'ប្រាំមួយ', 'ប្រាំពីរ', 'ប្រាំបី', 'ប្រាំបួន'];
  static TENS = ['', 'ដប់', 'ម្ភៃ', 'សាមសិប', 'សែសិប', 'ហាសិប', 'ហុកសិប', 'ចិតសិប', 'ប៉ែតសិប', 'កៅសិប'];
  static BANK_SCALES = ['', 'ពាន់', 'លាន', 'ពាន់លាន', 'ទ្រីលាន', 'ពាន់ទ្រីលាន'];
  static TRAD_POS = ['', '', 'រយ', 'ពាន់', 'ម៉ឺន', 'សែន', 'លាន'];
  static KM_NUMBERS = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];

  /**
   * Convert Arabic digits to Khmer digits (e.g. 1250 -> ១២៥០)
   */
  static toKhmerDigits(str) {
    if (!str) return '';
    return str.toString().replace(/[0-9]/g, d => this.KM_NUMBERS[parseInt(d, 10)]);
  }

  /**
   * Converts a 1-3 digit integer into Khmer words
   */
  static convertUnder1000(n, withSpaces = false) {
    const sep = withSpaces ? ' ' : '';
    let parts = [];
    const hundreds = Math.floor(n / 100);
    const remainder = n % 100;

    if (hundreds > 0) {
      parts.push(this.DIGITS[hundreds] + (withSpaces ? ' ' : '') + 'រយ');
    }

    if (remainder > 0) {
      const tens = Math.floor(remainder / 10);
      const units = remainder % 10;
      if (tens > 0) {
        parts.push(this.TENS[tens]);
        if (units > 0) {
          parts.push(this.DIGITS[units]);
        }
      } else {
        parts.push(this.DIGITS[units]);
      }
    }
    return parts.join(sep);
  }

  /**
   * Banking standard scale (Groups of 3 digits: ពាន់, លាន, ពាន់លាន)
   */
  static convertBanking(intStr, withSpaces = false) {
    intStr = intStr.toString().replace(/^0+/, '');
    if (!intStr) return this.DIGITS[0];

    const sep = withSpaces ? ' ' : '';
    const groups = [];
    let s = intStr;
    while (s.length > 0) {
      const start = Math.max(0, s.length - 3);
      groups.push(parseInt(s.slice(start), 10));
      s = s.slice(0, start);
    }

    let result = [];
    for (let i = groups.length - 1; i >= 0; i--) {
      const g = groups[i];
      if (g > 0) {
        const words = this.convertUnder1000(g, withSpaces);
        const scale = this.BANK_SCALES[i] ? this.BANK_SCALES[i] : '';
        result.push(scale ? words + (withSpaces ? ' ' : '') + scale : words);
      }
    }
    return result.join(sep) || this.DIGITS[0];
  }

  /**
   * Traditional Khmer counting under 1,000,000 (ពាន់, ម៉ឺន, សែន)
   */
  static convertUnderMillionTrad(intStr, withSpaces = false) {
    intStr = intStr.replace(/^0+/, '');
    if (!intStr) return '';
    const sep = withSpaces ? ' ' : '';
    const digits = intStr.split('').map(Number);
    const len = digits.length;
    let parts = [];
    for (let i = 0; i < len; i++) {
      const d = digits[i];
      const pos = len - 1 - i;
      if (d === 0) continue;
      if (pos === 1) {
        parts.push(this.TENS[d]);
      } else if (pos === 0) {
        parts.push(this.DIGITS[d]);
      } else {
        parts.push(this.DIGITS[d] + (withSpaces ? ' ' : '') + this.TRAD_POS[pos]);
      }
    }
    return parts.join(sep);
  }

  /**
   * Traditional Khmer scale with million recursively
   */
  static convertTraditional(intStr, withSpaces = false) {
    intStr = intStr.toString().replace(/^0+/, '');
    if (!intStr) return this.DIGITS[0];
    const sep = withSpaces ? ' ' : '';

    if (intStr.length <= 6) {
      return this.convertUnderMillionTrad(intStr, withSpaces) || this.DIGITS[0];
    }

    const millions = intStr.slice(0, intStr.length - 6);
    const remainder = intStr.slice(intStr.length - 6);

    const millWords = this.convertTraditional(millions, withSpaces) + (withSpaces ? ' ' : '') + 'លាន';
    const remWords = this.convertUnderMillionTrad(remainder, withSpaces);
    return remWords ? millWords + sep + remWords : millWords;
  }

  /**
   * Full conversion logic with currency and options
   */
  static convert(amountInput, options = {}) {
    const {
      currency = 'USD', // 'USD', 'KHR', 'THB', 'NONE'
      mode = 'banking', // 'banking', 'traditional'
      withSpaces = false,
      useExactKot = true
    } = options;

    if (amountInput === null || amountInput === undefined) {
      return { khmerWords: '', khmerDigits: '', formattedNumber: '', currencySymbol: '$' };
    }

    // Clean input
    let clean = amountInput.toString().replace(/,/g, '').trim();
    if (clean === '' || isNaN(Number(clean)) || Number(clean) < 0) {
      return { khmerWords: '', khmerDigits: '', formattedNumber: '', currencySymbol: '$' };
    }

    const parts = clean.split('.');
    const intPart = parts[0] || '0';
    const fracPart = parts.length > 1 ? parts[1] : '';

    const toWords = (str) => mode === 'traditional'
      ? this.convertTraditional(str, withSpaces)
      : this.convertBanking(str, withSpaces);

    const sep = withSpaces ? ' ' : '';
    const intNum = BigInt(intPart || '0');
    const intWords = toWords(intPart);
    let resultWords = '';

    let symbol = '$';
    let currencyName = 'ដុល្លារ';

    if (currency === 'KHR') {
      symbol = '៛';
      currencyName = 'រៀល';
      resultWords = intWords + sep + currencyName;
      if (useExactKot && (!fracPart || Number(fracPart) === 0)) {
        resultWords += sep + 'គត់';
      }
    } else if (currency === 'USD') {
      symbol = '$';
      currencyName = 'ដុល្លារ';
      const centsStr = fracPart ? (fracPart.length === 1 ? fracPart + '0' : fracPart.slice(0, 2)) : '00';
      const centsNum = parseInt(centsStr, 10);

      if (intNum === 0n && centsNum > 0) {
        resultWords = toWords(centsNum.toString()) + sep + 'សេន';
      } else {
        resultWords = intWords + sep + currencyName;
        if (centsNum > 0) {
          resultWords += sep + 'និង' + sep + toWords(centsNum.toString()) + sep + 'សេន';
        } else if (useExactKot) {
          resultWords += sep + 'គត់';
        }
      }
    } else if (currency === 'THB') {
      symbol = '฿';
      currencyName = 'បាត';
      const satangStr = fracPart ? (fracPart.length === 1 ? fracPart + '0' : fracPart.slice(0, 2)) : '00';
      const satangNum = parseInt(satangStr, 10);

      resultWords = intWords + sep + currencyName;
      if (satangNum > 0) {
        resultWords += sep + 'និង' + sep + toWords(satangNum.toString()) + sep + 'ស្តាង្គ';
      } else if (useExactKot) {
        resultWords += sep + 'គត់';
      }
    } else {
      // NONE (plain numbers)
      symbol = '';
      resultWords = intWords;
      if (fracPart && Number(fracPart) > 0) {
        const fracWords = fracPart.split('').map(d => this.DIGITS[parseInt(d, 10)]).join(sep);
        resultWords += sep + 'ចុច' + sep + fracWords;
      }
    }

    // Format display number with commas
    const formattedNumber = this.formatNumberWithCommas(clean);
    const khmerDigits = this.toKhmerDigits(formattedNumber);

    return {
      khmerWords: resultWords.trim(),
      khmerDigits: symbol ? `${symbol} ${khmerDigits}` : khmerDigits,
      rawKhmerDigits: khmerDigits,
      formattedNumber: symbol ? `${symbol} ${formattedNumber}` : formattedNumber,
      currencySymbol: symbol,
      currencyName: currencyName
    };
  }

  static formatNumberWithCommas(numStr) {
    const parts = numStr.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  }
}

// UI Controller & State Management
const state = {
  amount: '1250.50',
  currency: 'USD',
  mode: 'banking',
  withSpaces: false,
  useExactKot: true,
  theme: localStorage.getItem('khmer_amount_theme') || 'dark',
  history: JSON.parse(localStorage.getItem('khmer_amount_history') || '[]'),
  fontSize: parseInt(localStorage.getItem('khmer_amount_font_size') || '22', 10),
  showKeypad: true
};

// DOM Elements
const elements = {};

function initElements() {
  elements.amountInput = document.getElementById('amountInput');
  elements.clearBtn = document.getElementById('clearBtn');
  elements.khmerWords = document.getElementById('khmerWords');
  elements.khmerDigits = document.getElementById('khmerDigits');
  elements.formattedAmount = document.getElementById('formattedAmount');
  elements.copyWordsBtn = document.getElementById('copyWordsBtn');
  elements.copyAllBtn = document.getElementById('copyAllBtn');
  elements.copyDigitsBtn = document.getElementById('copyDigitsBtn');
  elements.shareBtn = document.getElementById('shareBtn');
  elements.speakBtn = document.getElementById('speakBtn');
  elements.exactKotCheck = document.getElementById('exactKotCheck');
  elements.spacingCheck = document.getElementById('spacingCheck');
  elements.fontPlusBtn = document.getElementById('fontPlusBtn');
  elements.fontMinusBtn = document.getElementById('fontMinusBtn');
  elements.themeToggleBtn = document.getElementById('themeToggleBtn');
  elements.themeIcon = document.getElementById('themeIcon');
  elements.installBtn = document.getElementById('installBtn');
  elements.quickChipsContainer = document.getElementById('quickChipsContainer');
  elements.historyList = document.getElementById('historyList');
  elements.clearHistoryBtn = document.getElementById('clearHistoryBtn');
  elements.toast = document.getElementById('toast');
  elements.toggleKeypadBtn = document.getElementById('toggleKeypadBtn');
  elements.onScreenKeypad = document.getElementById('onScreenKeypad');
  
  // Cheque Elements
  elements.chequeReceiptNo = document.getElementById('chequeReceiptNo');
  elements.chequeDate = document.getElementById('chequeDate');
  elements.chequePayee = document.getElementById('chequePayee');
  elements.chequePaymentMethod = document.getElementById('chequePaymentMethod');
  elements.chequeWords = document.getElementById('chequeWords');
  elements.chequeFigures = document.getElementById('chequeFigures');
  elements.chequeKmDigits = document.getElementById('chequeKmDigits');
  elements.chequeMemo = document.getElementById('chequeMemo');
  elements.printChequeBtn = document.getElementById('printChequeBtn');
  elements.copyChequeBtn = document.getElementById('copyChequeBtn');
  elements.downloadJpgBtn = document.getElementById('downloadJpgBtn');
  elements.shareJpgBtn = document.getElementById('shareJpgBtn');
  elements.quickDownloadJpgBtn = document.getElementById('quickDownloadJpgBtn');
  elements.quickPrintBtn = document.getElementById('quickPrintBtn');
  elements.receiptCanvas = document.getElementById('receiptCanvas');
}

function showToast(message, duration = 2500) {
  if (!elements.toast) return;
  elements.toast.textContent = message;
  elements.toast.classList.add('show');
  setTimeout(() => {
    elements.toast.classList.remove('show');
  }, duration);
}

function renderQuickChips() {
  if (!elements.quickChipsContainer) return;
  elements.quickChipsContainer.innerHTML = '';

  let chips = [];
  if (state.currency === 'USD') {
    chips = [
      { label: '+$1', value: 1 },
      { label: '+$10', value: 10 },
      { label: '+$50', value: 50 },
      { label: '+$100', value: 100 },
      { label: '+$500', value: 500 },
      { label: '+$1,000', value: 1000 }
    ];
  } else if (state.currency === 'KHR') {
    chips = [
      { label: '+1,000៛', value: 1000 },
      { label: '+5,000៛', value: 5000 },
      { label: '+10,000៛', value: 10000 },
      { label: '+50,000៛', value: 50000 },
      { label: '+100,000៛', value: 100000 },
      { label: '+500,000៛', value: 500000 },
      { label: '+1,000,000៛', value: 1000000 }
    ];
  } else if (state.currency === 'THB') {
    chips = [
      { label: '+฿20', value: 20 },
      { label: '+฿50', value: 50 },
      { label: '+฿100', value: 100 },
      { label: '+฿500', value: 500 },
      { label: '+฿1,000', value: 1000 }
    ];
  } else {
    chips = [
      { label: '+10', value: 10 },
      { label: '+100', value: 100 },
      { label: '+1,000', value: 1000 },
      { label: '+10,000', value: 10000 }
    ];
  }

  chips.forEach(chip => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip-btn';
    btn.textContent = chip.label;
    btn.addEventListener('click', () => {
      let current = parseFloat(state.amount) || 0;
      current += chip.value;
      // round to 2 decimals if USD/THB, integer if KHR
      if (state.currency === 'KHR') {
        state.amount = Math.round(current).toString();
      } else {
        state.amount = (Math.round(current * 100) / 100).toString();
      }
      elements.amountInput.value = state.amount;
      updateConversion(true);
    });
    elements.quickChipsContainer.appendChild(btn);
  });
}

function updateConversion(saveToHistory = false) {
  const result = KhmerAmountConverter.convert(state.amount, {
    currency: state.currency,
    mode: state.mode,
    withSpaces: state.withSpaces,
    useExactKot: state.useExactKot
  });

  if (result.khmerWords) {
    elements.khmerWords.textContent = result.khmerWords;
    elements.khmerDigits.textContent = result.khmerDigits;
    elements.formattedAmount.textContent = result.formattedNumber;

    // Update Cheque Preview
    if (elements.chequeWords) elements.chequeWords.textContent = result.khmerWords;
    if (elements.chequeFigures) elements.chequeFigures.textContent = result.formattedNumber;
    if (elements.chequeKmDigits) elements.chequeKmDigits.textContent = result.khmerDigits;

    if (saveToHistory && state.amount && Number(state.amount) > 0) {
      addHistoryItem(state.amount, result.khmerWords, result.formattedNumber);
    }
  } else {
    elements.khmerWords.textContent = 'សូមបញ្ចូលចំនួនទឹកប្រាក់...';
    elements.khmerDigits.textContent = '---';
    elements.formattedAmount.textContent = '---';
    if (elements.chequeWords) elements.chequeWords.textContent = '---';
    if (elements.chequeFigures) elements.chequeFigures.textContent = '---';
  }
}

function addHistoryItem(amount, words, formatted) {
  // Avoid duplicate of recent
  if (state.history.length > 0 && state.history[0].amount === amount && state.history[0].currency === state.currency) {
    return;
  }
  const item = {
    id: Date.now(),
    amount,
    currency: state.currency,
    words,
    formatted,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };
  state.history.unshift(item);
  if (state.history.length > 20) state.history.pop();
  localStorage.setItem('khmer_amount_history', JSON.stringify(state.history));
  renderHistory();
}

function renderHistory() {
  if (!elements.historyList) return;
  elements.historyList.innerHTML = '';

  if (state.history.length === 0) {
    elements.historyList.innerHTML = '<li class="empty-history">មិនទាន់មានប្រវត្តិបម្លែងនៅឡើយទេ</li>';
    return;
  }

  state.history.forEach(item => {
    const li = document.createElement('li');
    li.className = 'history-item';
    li.innerHTML = `
      <div class="history-content">
        <div class="history-num">${item.formatted} <span class="history-time">${item.time}</span></div>
        <div class="history-words">${item.words}</div>
      </div>
      <div class="history-actions">
        <button class="hist-btn copy-hist" title="ចម្លង">📋</button>
        <button class="hist-btn load-hist" title="ផ្ទុកឡើងវិញ">↺</button>
      </div>
    `;

    li.querySelector('.copy-hist').addEventListener('click', (e) => {
      e.stopPropagation();
      navigator.clipboard.writeText(item.words).then(() => {
        showToast('បានចម្លងអក្សរខ្មែរ!');
      });
    });

    li.querySelector('.load-hist').addEventListener('click', () => {
      state.amount = item.amount;
      state.currency = item.currency;
      elements.amountInput.value = state.amount;
      syncCurrencyTabs();
      renderQuickChips();
      updateConversion(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    elements.historyList.appendChild(li);
  });
}

function syncCurrencyTabs() {
  document.querySelectorAll('.currency-tab').forEach(tab => {
    if (tab.dataset.currency === state.currency) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });
}

function syncModeTabs() {
  document.querySelectorAll('.mode-tab').forEach(tab => {
    if (tab.dataset.mode === state.mode) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });
}

function applyTheme(theme) {
  state.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('khmer_amount_theme', theme);
  if (elements.themeIcon) {
    elements.themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
  }
}

function applyFontSize() {
  if (elements.khmerWords) {
    elements.khmerWords.style.fontSize = `${state.fontSize}px`;
  }
  localStorage.setItem('khmer_amount_font_size', state.fontSize);
}

// On-screen touch keypad event handler
function handleKeypadPress(key) {
  let val = elements.amountInput.value || '';
  if (key === 'C') {
    val = '';
  } else if (key === 'BACK') {
    val = val.slice(0, -1);
  } else if (key === '.') {
    if (!val.includes('.')) {
      val = val === '' ? '0.' : val + '.';
    }
  } else if (key === '00' || key === '000') {
    if (val !== '' && val !== '0') {
      val += key;
    }
  } else {
    // Digits 0-9
    if (val === '0') {
      val = key;
    } else {
      val += key;
    }
  }
  elements.amountInput.value = val;
  state.amount = val;
  updateConversion(false);
}

// Speak aloud using Web Speech API with fallback
function speakKhmerWords(text) {
  if (!('speechSynthesis' in window)) {
    showToast('ឧបករណ៍របស់អ្នកមិនគាំទ្រការអានសំឡេងទេ (No Speech API)');
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  
  // Try to find a Khmer voice
  const voices = window.speechSynthesis.getVoices();
  const kmVoice = voices.find(v => v.lang.includes('km') || v.lang.includes('kh'));
  if (kmVoice) {
    utterance.voice = kmVoice;
  }
  utterance.rate = 0.85; // slightly slower for clear Khmer pronunciation
  utterance.pitch = 1.0;

  utterance.onstart = () => {
    elements.speakBtn.classList.add('speaking');
    showToast('កំពុងអានជាសំឡេង...');
  };
  utterance.onend = () => {
    elements.speakBtn.classList.remove('speaking');
  };
  utterance.onerror = () => {
    elements.speakBtn.classList.remove('speaking');
    showToast('សូមអភ័យទោស មិនមានសំឡេងភាសាខ្មែរលើឧបករណ៍នេះទេ');
  };

  window.speechSynthesis.speak(utterance);
}

// Setup Event Listeners
function setupEventListeners() {
  // Amount typing
  elements.amountInput.addEventListener('input', (e) => {
    state.amount = e.target.value.replace(/[^0-9.]/g, '');
    e.target.value = state.amount;
    updateConversion(false);
  });

  elements.amountInput.addEventListener('change', () => {
    updateConversion(true);
  });

  // Clear button
  elements.clearBtn.addEventListener('click', () => {
    elements.amountInput.value = '';
    state.amount = '';
    updateConversion(false);
    elements.amountInput.focus();
  });

  // Currency selection tabs
  document.querySelectorAll('.currency-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      state.currency = tab.dataset.currency;
      syncCurrencyTabs();
      renderQuickChips();
      updateConversion(true);
    });
  });

  // Mode selection tabs (Banking vs Traditional)
  document.querySelectorAll('.mode-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      state.mode = tab.dataset.mode;
      syncModeTabs();
      updateConversion(true);
    });
  });

  // Checkboxes
  elements.exactKotCheck.addEventListener('change', (e) => {
    state.useExactKot = e.target.checked;
    updateConversion(false);
  });

  elements.spacingCheck.addEventListener('change', (e) => {
    state.withSpaces = e.target.checked;
    updateConversion(false);
  });

  // Font resize
  elements.fontPlusBtn.addEventListener('click', () => {
    if (state.fontSize < 36) {
      state.fontSize += 2;
      applyFontSize();
    }
  });

  elements.fontMinusBtn.addEventListener('click', () => {
    if (state.fontSize > 16) {
      state.fontSize -= 2;
      applyFontSize();
    }
  });

  // Theme toggle
  elements.themeToggleBtn.addEventListener('click', () => {
    applyTheme(state.theme === 'dark' ? 'light' : 'dark');
  });

  // Copy buttons
  elements.copyWordsBtn.addEventListener('click', () => {
    const text = elements.khmerWords.textContent;
    if (!text || text.includes('សូមបញ្ចូល')) return;
    navigator.clipboard.writeText(text).then(() => {
      showToast('បានចម្លងអក្សរខ្មែរជោគជ័យ! ✅');
    });
  });

  elements.copyDigitsBtn.addEventListener('click', () => {
    const text = elements.khmerDigits.textContent;
    if (!text || text.includes('---')) return;
    navigator.clipboard.writeText(text).then(() => {
      showToast('បានចម្លងលេខខ្មែរជោគជ័យ! ✅');
    });
  });

  elements.copyAllBtn.addEventListener('click', () => {
    const formatted = elements.formattedAmount.textContent;
    const digits = elements.khmerDigits.textContent;
    const words = elements.khmerWords.textContent;
    if (!words || words.includes('សូមបញ្ចូល')) return;
    const all = `ចំនួនទឹកប្រាក់៖ ${formatted} (${digits})\nជាអក្សរខ្មែរ៖ ${words}`;
    navigator.clipboard.writeText(all).then(() => {
      showToast('បានចម្លងព័ត៌មានទាំងអស់! ✅');
    });
  });

  // Share API
  elements.shareBtn.addEventListener('click', async () => {
    const words = elements.khmerWords.textContent;
    const formatted = elements.formattedAmount.textContent;
    if (!words || words.includes('សូមបញ្ចូល')) return;

    const shareData = {
      title: 'ចំនួនទឹកប្រាក់ជាអក្សរខ្មែរ',
      text: `${formatted}\nជាអក្សរខ្មែរ៖ ${words}`
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled or share failed
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareData.text).then(() => {
        showToast('បានចម្លងសម្រាប់ចែករំលែក!');
      });
    }
  });

  // Speech TTS
  elements.speakBtn.addEventListener('click', () => {
    const text = elements.khmerWords.textContent;
    if (!text || text.includes('សូមបញ្ចូល')) return;
    speakKhmerWords(text);
  });

  // Keypad keys
  document.querySelectorAll('.key-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      handleKeypadPress(btn.dataset.key);
    });
  });

  // Toggle keypad button
  elements.toggleKeypadBtn.addEventListener('click', () => {
    state.showKeypad = !state.showKeypad;
    elements.onScreenKeypad.classList.toggle('collapsed', !state.showKeypad);
    elements.toggleKeypadBtn.textContent = state.showKeypad ? '⌨️ បិទក្តារចុច' : '⌨️ បើកក្តារចុច';
  });

  // Clear history
  elements.clearHistoryBtn.addEventListener('click', () => {
    if (confirm('តើអ្នកចង់លុបប្រវត្តិទាំងអស់មែនទេ?')) {
      state.history = [];
      localStorage.removeItem('khmer_amount_history');
      renderHistory();
      showToast('បានសម្អាតប្រវត្តិ');
    }
  });

  // Cheque & Print/JPG Actions
  if (elements.printChequeBtn) {
    elements.printChequeBtn.addEventListener('click', () => {
      triggerPrintReceipt();
    });
  }

  if (elements.quickPrintBtn) {
    elements.quickPrintBtn.addEventListener('click', () => {
      triggerPrintReceipt();
    });
  }

  if (elements.downloadJpgBtn) {
    elements.downloadJpgBtn.addEventListener('click', () => {
      downloadReceiptJPG();
    });
  }

  if (elements.quickDownloadJpgBtn) {
    elements.quickDownloadJpgBtn.addEventListener('click', () => {
      downloadReceiptJPG();
    });
  }

  if (elements.shareJpgBtn) {
    elements.shareJpgBtn.addEventListener('click', () => {
      shareReceiptJPG();
    });
  }

  if (elements.copyChequeBtn) {
    elements.copyChequeBtn.addEventListener('click', () => {
      const receiptNo = elements.chequeReceiptNo ? elements.chequeReceiptNo.value : 'REC-001';
      const date = elements.chequeDate ? elements.chequeDate.value : '';
      const payee = elements.chequePayee ? elements.chequePayee.value : '';
      const method = elements.chequePaymentMethod ? elements.chequePaymentMethod.value : 'សាច់ប្រាក់';
      const words = elements.chequeWords ? elements.chequeWords.textContent : '';
      const figures = elements.chequeFigures ? elements.chequeFigures.textContent : '';
      const memo = elements.chequeMemo ? elements.chequeMemo.value : '';

      const voucher = `==== បង្កាន់ដៃទូទាត់ប្រាក់ / PAYMENT RECEIPT ====\nលេខវិក្កយបត្រ (No)៖ ${receiptNo}\nកាលបរិច្ឆេទ (Date)៖ ${date}\nបង់ជូនឈ្មោះ (Client)៖ ${payee || '---'}\nទូទាត់តាម (Method)៖ ${method}\nចំនួនទឹកប្រាក់ជាលេខ (Amount)៖ ${figures}\nចំនួនទឹកប្រាក់ជាអក្សរ (In Words)៖ ${words}\nសម្រាប់ (Memo)៖ ${memo || '---'}\nស្ថានភាព៖ ★ បានទូទាត់រួចរាល់ (PAID) ★\n=================================================`;
      navigator.clipboard.writeText(voucher).then(() => {
        showToast('បានចម្លងព័ត៌មានបង្កាន់ដៃ! ✅');
      });
    });
  }
}

// Canvas Rendering for Crisp JPG Receipt Export
function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let currentY = y;

  if (words.length > 1) {
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        ctx.fillText(line.trim(), x, currentY);
        line = words[n] + ' ';
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line.trim(), x, currentY);
  } else {
    let currentLine = '';
    for (let i = 0; i < text.length; i++) {
      const testLine = currentLine + text[i];
      if (ctx.measureText(testLine).width > maxWidth && i > 0) {
        ctx.fillText(currentLine, x, currentY);
        currentLine = text[i];
        currentY += lineHeight;
      } else {
        currentLine = testLine;
      }
    }
    ctx.fillText(currentLine, x, currentY);
  }
}

function generateReceiptCanvas() {
  const canvas = elements.receiptCanvas || document.createElement('canvas');
  const width = 1200;
  const height = 750;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Background - high quality paper texture tone
  ctx.fillStyle = '#FAF9F5';
  ctx.fillRect(0, 0, width, height);

  // Outer ornate double border
  ctx.strokeStyle = '#0F2C59';
  ctx.lineWidth = 6;
  ctx.strokeRect(20, 20, width - 40, height - 40);

  ctx.strokeStyle = '#C5A880';
  ctx.lineWidth = 2;
  ctx.strokeRect(28, 28, width - 56, height - 56);

  // Corner decorations
  const corners = [
    [28, 28], [width - 28, 28],
    [28, height - 28], [width - 28, height - 28]
  ];
  ctx.fillStyle = '#C5A880';
  corners.forEach(([cx, cy]) => {
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fill();
  });

  // Background subtle watermark
  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate(-Math.PI / 12);
  ctx.font = 'bold 46px "Kantumruy Pro", sans-serif';
  ctx.fillStyle = 'rgba(15, 44, 89, 0.035)';
  ctx.textAlign = 'center';
  ctx.fillText('KHMER AMOUNT CONVERTER • OFFICIAL RECEIPT', 0, 0);
  ctx.restore();

  // Top Header: Currency Badge
  ctx.save();
  ctx.fillStyle = '#0F2C59';
  ctx.beginPath();
  ctx.arc(75, 75, 32, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#C5A880';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.font = 'bold 30px "Kantumruy Pro", "Battambang", sans-serif';
  ctx.fillStyle = '#F59E0B';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('៛', 73, 75);
  ctx.restore();

  // Header Titles
  ctx.font = 'bold 28px "Kantumruy Pro", "Battambang", sans-serif';
  ctx.fillStyle = '#0F2C59';
  ctx.textAlign = 'left';
  ctx.fillText('បង្កាន់ដៃទទួលប្រាក់', 125, 68);

  ctx.font = 'bold 15px sans-serif';
  ctx.fillStyle = '#A16207';
  ctx.fillText('OFFICIAL PAYMENT VOUCHER / RECEIPT', 125, 94);

  // Top Right Meta Box
  const receiptNo = (elements.chequeReceiptNo && elements.chequeReceiptNo.value.trim()) ? elements.chequeReceiptNo.value.trim() : 'REC-001';
  const receiptDate = (elements.chequeDate && elements.chequeDate.value) ? elements.chequeDate.value : new Date().toISOString().split('T')[0];

  ctx.textAlign = 'right';
  ctx.font = 'bold 15px monospace';
  ctx.fillStyle = '#0F2C59';
  ctx.fillText('លេខវិក្កយបត្រ (No): ' + receiptNo, width - 50, 68);

  ctx.font = '14px "Kantumruy Pro", sans-serif';
  ctx.fillStyle = '#64748B';
  ctx.fillText('កាលបរិច្ឆេទ (Date): ' + receiptDate, width - 50, 94);

  // Divider Line
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(50, 120);
  ctx.lineTo(width - 50, 120);
  ctx.stroke();

  ctx.strokeStyle = '#C5A880';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(50, 120);
  ctx.lineTo(250, 120);
  ctx.stroke();

  // Client Details Row
  const payee = (elements.chequePayee && elements.chequePayee.value.trim()) ? elements.chequePayee.value.trim() : 'អតិថិជនទូទៅ (General Client)';
  const paymentMethod = elements.chequePaymentMethod ? elements.chequePaymentMethod.value : 'សាច់ប្រាក់ (Cash)';

  ctx.textAlign = 'left';
  ctx.font = 'bold 16px "Kantumruy Pro", sans-serif';
  ctx.fillStyle = '#334155';
  ctx.fillText('បង់ជូនឈ្មោះ (Client / Payee):', 55, 160);

  ctx.font = 'bold 18px "Kantumruy Pro", sans-serif';
  ctx.fillStyle = '#0F2C59';
  ctx.fillText(payee, 305, 160);

  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(300, 168);
  ctx.lineTo(width - 55, 168);
  ctx.stroke();
  ctx.setLineDash([]);

  // Payment Method Row
  ctx.font = 'bold 16px "Kantumruy Pro", sans-serif';
  ctx.fillStyle = '#334155';
  ctx.fillText('ទូទាត់តាម (Payment Method):', 55, 205);

  ctx.font = 'bold 16px "Kantumruy Pro", sans-serif';
  ctx.fillStyle = '#0284C7';
  ctx.fillText(paymentMethod, 305, 205);

  // Box 1: Amount in Figures
  const figures = (elements.chequeFigures && elements.chequeFigures.textContent !== '---') ? elements.chequeFigures.textContent : elements.formattedAmount.textContent;
  const kmDigits = (elements.chequeKmDigits && elements.chequeKmDigits.textContent !== '---') ? elements.chequeKmDigits.textContent : elements.khmerDigits.textContent;

  ctx.fillStyle = '#EFF6FF';
  ctx.fillRect(55, 235, width - 110, 75);
  ctx.strokeStyle = '#3B82F6';
  ctx.lineWidth = 2;
  ctx.strokeRect(55, 235, width - 110, 75);

  ctx.font = 'bold 15px "Kantumruy Pro", sans-serif';
  ctx.fillStyle = '#1E3A8A';
  ctx.fillText('ចំនួនទឹកប្រាក់ជាលេខ (Amount in Figures):', 75, 260);

  ctx.font = '900 28px monospace';
  ctx.fillStyle = '#1D4ED8';
  ctx.fillText(figures, 75, 295);

  if (kmDigits && kmDigits !== '---') {
    ctx.font = 'bold 20px "Kantumruy Pro", sans-serif';
    ctx.fillStyle = '#B45309';
    ctx.textAlign = 'right';
    ctx.fillText('( ' + kmDigits + ' )', width - 75, 295);
    ctx.textAlign = 'left';
  }

  // Box 2: Amount in Khmer Words (The Star Feature)
  const words = (elements.chequeWords && elements.chequeWords.textContent !== '---') ? elements.chequeWords.textContent : elements.khmerWords.textContent;

  ctx.fillStyle = '#FEFCE8';
  ctx.fillRect(55, 330, width - 110, 115);
  ctx.strokeStyle = '#CA8A04';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(55, 330, width - 110, 115);

  ctx.font = 'bold 16px "Kantumruy Pro", sans-serif';
  ctx.fillStyle = '#854D0E';
  ctx.fillText('ចំនួនទឹកប្រាក់ជាអក្សរខ្មែរ (In Khmer Words):', 75, 360);

  ctx.font = 'bold 22px "Kantumruy Pro", "Battambang", sans-serif';
  ctx.fillStyle = '#78350F';
  wrapText(ctx, words, 75, 395, width - 150, 32);

  // Memo / Description Row
  const memo = (elements.chequeMemo && elements.chequeMemo.value.trim()) ? elements.chequeMemo.value.trim() : 'ទូទាត់ថ្លៃទំនិញ និងសេវាកម្ម (Payment for goods & services)';
  ctx.font = 'bold 15px "Kantumruy Pro", sans-serif';
  ctx.fillStyle = '#475569';
  ctx.fillText('សម្រាប់ (Description / For):', 55, 480);

  ctx.font = '16px "Kantumruy Pro", sans-serif';
  ctx.fillStyle = '#0F172A';
  ctx.fillText(memo, 295, 480);

  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(290, 488);
  ctx.lineTo(width - 55, 488);
  ctx.stroke();
  ctx.setLineDash([]);

  // Footer Section
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(50, 520);
  ctx.lineTo(width - 50, 520);
  ctx.stroke();

  // Notes on left
  ctx.font = '13px "Kantumruy Pro", sans-serif';
  ctx.fillStyle = '#64748B';
  ctx.fillText('* បង្កាន់ដៃត្រឹមត្រូវតាមច្បាប់ • សូមរក្សាទុកជាភស្តុតាងនៃការទូទាត់', 55, 550);
  ctx.font = '11px sans-serif';
  ctx.fillStyle = '#94A3B8';
  ctx.fillText('Issued via Khmer Amount Converter App • Ready for accounting & audit', 55, 570);

  // Red Official PAID Stamp
  ctx.save();
  ctx.translate(width / 2 + 80, 595);
  ctx.rotate(-10 * Math.PI / 180);

  ctx.strokeStyle = '#DC2626';
  ctx.lineWidth = 3.5;
  ctx.fillStyle = 'rgba(220, 38, 38, 0.08)';
  ctx.strokeRect(-90, -35, 180, 70);
  ctx.fillRect(-90, -35, 180, 70);

  ctx.strokeStyle = '#DC2626';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-84, -30, 168, 60);

  ctx.fillStyle = '#DC2626';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('★ ★ ★', 0, -14);

  ctx.font = 'bold 15px "Kantumruy Pro", sans-serif';
  ctx.fillText('បានទូទាត់', 0, 4);

  ctx.font = '900 18px monospace';
  ctx.letterSpacing = '2px';
  ctx.fillText('PAID', 0, 24);
  ctx.restore();

  // Right: Signature Line
  ctx.textAlign = 'center';
  ctx.strokeStyle = '#0F2C59';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(width - 230, 630);
  ctx.lineTo(width - 55, 630);
  ctx.stroke();

  ctx.font = 'bold 14px "Kantumruy Pro", sans-serif';
  ctx.fillStyle = '#0F2C59';
  ctx.fillText('ហត្ថលេខា និងត្រាអ្នកទទួល', width - 142, 650);

  ctx.font = '11px sans-serif';
  ctx.fillStyle = '#64748B';
  ctx.fillText('Authorized Signature', width - 142, 668);

  return canvas;
}

function triggerPrintReceipt() {
  const words = elements.khmerWords.textContent;
  if (!words || words.includes('សូមបញ្ចូល')) {
    showToast('សូមបញ្ចូលចំនួនទឹកប្រាក់ជាមុនសិន!');
    return;
  }

  const canvas = generateReceiptCanvas();
  const dateStr = elements.chequeDate ? elements.chequeDate.value.replace(/-/g, '') : 'date';
  const cleanAmt = state.amount ? state.amount.replace(/[^0-9.]/g, '') : 'amount';
  const jobName = `Receipt_${cleanAmt}_${state.currency}_${dateStr}`;

  // Method A: Native Android Print Bridge (calls PrintHelper / PrintManager)
  if (window.AndroidBridge && typeof window.AndroidBridge.printReceipt === 'function') {
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    showToast('កំពុងបើកផ្ទាំងបោះពុម្ព... 🖨️');
    window.AndroidBridge.printReceipt(dataUrl, jobName);
    return;
  }

  // Method B: Standard Browser Print fallback
  window.print();
}

function downloadReceiptJPG() {
  const words = elements.khmerWords.textContent;
  if (!words || words.includes('សូមបញ្ចូល')) {
    showToast('សូមបញ្ចូលចំនួនទឹកប្រាក់ជាមុនសិន!');
    return;
  }

  const canvas = generateReceiptCanvas();
  const dateStr = elements.chequeDate ? elements.chequeDate.value.replace(/-/g, '') : 'date';
  const cleanAmt = state.amount ? state.amount.replace(/[^0-9.]/g, '') : 'amount';
  const filename = `Receipt_${cleanAmt}_${state.currency}_${dateStr}.jpg`;

  // Method A: Native Android APK Bridge (saves directly into Phone Gallery / Pictures)
  if (window.AndroidBridge && typeof window.AndroidBridge.saveImageToGallery === 'function') {
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    showToast('កំពុងរក្សាទុកក្នុង Gallery... 🖼️');
    window.AndroidBridge.saveImageToGallery(dataUrl, filename);
    return;
  }

  // Method B: Standard Browser download fallback
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 150);
    showToast('បានទាញយកឯកសារ JPG ជោគជ័យ! ✅');
  }, 'image/jpeg', 0.95);
}

async function shareReceiptJPG() {
  const words = elements.khmerWords.textContent;
  if (!words || words.includes('សូមបញ្ចូល')) {
    showToast('សូមបញ្ចូលចំនួនទឹកប្រាក់ជាមុនសិន!');
    return;
  }

  const canvas = generateReceiptCanvas();
  const dateStr = elements.chequeDate ? elements.chequeDate.value.replace(/-/g, '') : 'date';
  const cleanAmt = state.amount ? state.amount.replace(/[^0-9.]/g, '') : 'amount';
  const filename = `Receipt_${cleanAmt}_${state.currency}_${dateStr}.jpg`;

  // Method A: Native Android Share Bridge (shares real file to Telegram, Messenger, etc.)
  if (window.AndroidBridge && typeof window.AndroidBridge.shareImage === 'function') {
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    window.AndroidBridge.shareImage(dataUrl, filename);
    return;
  }

  // Method B: Web Share API fallback
  canvas.toBlob(async (blob) => {
    if (!blob) return;
    const file = new File([blob], filename, { type: 'image/jpeg' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: 'បង្កាន់ដៃទូទាត់ប្រាក់ (Payment Receipt)',
          text: `បង្កាន់ដៃទូទាត់ប្រាក់៖ ${elements.formattedAmount.textContent}\nជាអក្សរខ្មែរ៖ ${elements.khmerWords.textContent}`,
          files: [file]
        });
      } catch (err) {}
    } else {
      downloadReceiptJPG();
      showToast('ឧបករណ៍នេះមិនគាំទ្រ Direct Share ទេ (បានទាញយកជា JPG ជំនួសវិញ)');
    }
  }, 'image/jpeg', 0.95);
}

// PWA Install Prompt handling
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (elements.installBtn) {
    elements.installBtn.style.display = 'inline-flex';
  }
});

function setupPWAInstall() {
  if (elements.installBtn) {
    elements.installBtn.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          showToast('សូមអរគុណសម្រាប់ការដំឡើងកម្មវិធី! 🎉');
        }
        deferredPrompt = null;
        elements.installBtn.style.display = 'none';
      } else {
        showToast('ដើម្បីដំឡើងលើ Android: ចុចសញ្ញាចុចបី (⋮) ជ្រើសយក "Add to Home screen" ឬ "Install App"');
      }
    });
  }

  // Register service worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(err => {
        console.log('SW registration error:', err);
      });
    });
  }
}

// Set today's date in Cheque
function initChequeDate() {
  if (elements.chequeDate) {
    const today = new Date().toISOString().split('T')[0];
    elements.chequeDate.value = today;
  }
}

// Init Application
document.addEventListener('DOMContentLoaded', () => {
  initElements();
  applyTheme(state.theme);
  applyFontSize();
  initChequeDate();
  syncCurrencyTabs();
  syncModeTabs();
  renderQuickChips();
  elements.amountInput.value = state.amount;
  updateConversion(false);
  renderHistory();
  setupEventListeners();
  setupPWAInstall();
});
