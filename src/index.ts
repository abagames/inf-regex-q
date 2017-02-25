import * as _ from 'lodash';
import RandExp = require('randexp');
import Random from './random';

RandExp.prototype.randInt = (from, to) => random.getInt(from, to);

window.onload = init;

const version = '1';
let quizRandom = new Random();
let random = new Random();
let matchStrings: string[];
let unmatchStrings: string[];
let regexpInput: HTMLInputElement;
let passButton: HTMLButtonElement;
let showingPassButtonTimeout: number;
let ansLength: number;
let genStringsCount: number;
let quizCount: number;
let quizBeginMills: number;
let quizTimeInterval: number;

function init() {
  regexpInput = <HTMLInputElement>document.getElementById('regexp_input');
  regexpInput.onkeydown = updateRegexpInput;
  regexpInput.onkeyup = updateRegexpInput;
  passButton = <HTMLButtonElement>document.getElementById('pass_button');
  passButton.onclick = () => {
    if (quizCount == null) {
      initQuiz();
    } else {
      quizCount--;
    }
    nextQuiz();
  }
  initQuiz();
  if (checkQuery() === false) {
    nextQuiz();
  }
}

function initQuiz() {
  quizCount = 0;
  quizBeginMills = new Date().getTime();
  if (quizTimeInterval != null) {
    clearTimeout(quizTimeInterval);
  }
  quizTimeInterval = setInterval(updateQuitTime, 1000);
  updateQuitTime();
}

function updateQuitTime() {
  const td = document.getElementById('quiz_time');
  const duration = new Date().getTime() - quizBeginMills;
  let seconds = Math.floor(duration / 1000) % 60;
  let minutes = Math.floor(duration / (1000 * 60)) % 60;
  td.textContent = `${minutes < 10 ? '0' : '0'}${minutes} : ${seconds < 10 ? '0' : ''}${seconds}`;
}

function checkQuery() {
  const query = window.location.search.substring(1);
  if (query == null) {
    return false;
  }
  let params = query.split('&');
  let _version: string;
  let _seed: string;
  _.forEach(params, param => {
    const pair = param.split('=');
    if (pair[0] === 'v') {
      _version = pair[1];
    } else if (pair[0] === 's') {
      _seed = pair[1];
    }
  });
  if (_version !== version || _seed == null) {
    return false;
  }
  genQuiz(Number(_seed));
}

function nextQuiz() {
  const seed = quizRandom.getToMaxInt();
  genQuiz(seed);
  const baseUrl = window.location.href.split('?')[0];
  const url = `${baseUrl}?v=${version}&s=${seed}`;
  try {
    window.history.replaceState({}, '', url);
  } catch (e) { }
  regexpInput.focus();
}

function genQuiz(seed: number) {
  quizCount++;
  if (quizCount > 10) {
    endQuiz();
    return;
  }
  const qd = document.getElementById('quiz_count');
  qd.textContent = `Q.${quizCount}`;
  hidePassButton();
  showingPassButtonTimeout = setTimeout(() => {
    passButton.style.visibility = 'visible';
  }, 10 * 1000);
  random.setSeed(seed);
  let ans: string;
  let ansExp: RegExp;
  for (let i = 0; i < 16; i++) {
    ans = genPattern(random.getInt(3, 10));
    try {
      ansExp = new RegExp(ans);
    } catch (e) {
      ans = null;
      continue;
    }
    genStrings(ansExp);
    if (matchStrings.length < 2 || matchStrings.length > genStringsCount - 2 ||
      unmatchStrings.length < 2) {
      ans = null;
      continue;
    }
    break;
  }
  if (ans === null) {
    genQuiz(Math.floor(seed / 2));
    return;
  }
  regexpInput.value = prevRegexpInput = '';
  regexpInput.removeAttribute('disabled');
  testRegexp = new RegExp('');
  ansLength = ans.length;
  regexpInput.setAttribute('maxlength', `${ansLength}`);
  updateDisps();
}

function hidePassButton() {
  if (showingPassButtonTimeout != null) {
    clearTimeout(showingPassButtonTimeout);
  }
  passButton.style.visibility = 'hidden';
  passButton.textContent = 'Pass';
}

function genPattern(len: number) {
  const randChars = ['*', '+', '?', '.', '|'];
  let p = '';
  for (let i = 0; i < len; i++) {
    const pr = random.get();
    if (pr < 0.1) {
      const br = new RandExp(`\\^?[a-z]{${random.getInt(2, 4)}}`).gen();
      p += `[${br}]`;
    } else if (pr < 0.15) {
      p += `{${random.getInt(2, 5)}}`;
    } else if (pr < 0.2) {
      const bl = random.getInt(1, len - i);
      p += `(${genPattern(bl)})`;
      i += bl;
    } else if (pr < 0.6) {
      p += randChars[random.getInt(randChars.length)];
    } else if (pr < 0.8) {
      p += String.fromCharCode('0'.charCodeAt(0) + random.getInt(10));
    } else {
      p += String.fromCharCode('a'.charCodeAt(0) + random.getInt(26));
    }
  }
  return p;
}

function genStrings(ansExp: RegExp) {
  matchStrings = [];
  unmatchStrings = [];
  const randExp = new RandExp(ansExp);
  randExp.max = 3;
  genStringsCount = random.get(5, 11);
  _.times(genStringsCount, () => {
    let s: string = randExp.gen();
    _.times(random.getInt(0, 3), () => {
      const sp = random.getInt(s.length - 1);
      if (s.length >= 3 && random.get() < 0.5) {
        s = s.slice(0, sp) + s.slice(sp + 1);
      } else {
        s = s.slice(0, sp) + new RandExp(/[a-z0-9]/).gen() + s.slice(sp);
      }
    });
    if (ansExp.test(s)) {
      if (!_.some(matchStrings, ms => s === ms)) {
        matchStrings.push(s);
      }
    } else {
      if (!_.some(unmatchStrings, us => s === us)) {
        unmatchStrings.push(s);
      }
    }
  });
}

function endQuiz() {
  clearInterval(quizTimeInterval);
  const qd = document.getElementById('quiz_count');
  qd.textContent = 'You found 10 regexps in';
  quizCount = null;
  passButton.textContent = 'Retry';
  passButton.style.visibility = 'visible';
}

let prevRegexpInput: string;
let testRegexp: RegExp;

function updateRegexpInput() {
  const text = regexpInput.value;
  if (prevRegexpInput === text) {
    return;
  }
  prevRegexpInput = text;
  try {
    testRegexp = new RegExp(text);
  } catch (e) {
    testRegexp = null;
  }
  updateDisps();
}

function updateDisps() {
  const matchState = updateDisp(matchStrings, 'match');
  const unmatchState = updateDisp(unmatchStrings, 'unmatch');
  document.getElementById('input_count').textContent =
    `${prevRegexpInput.length} / ${ansLength}`;
  if (matchState.isAllMatched && unmatchState.isAllUnmatched) {
    regexpInput.setAttribute('disabled', '');
    hidePassButton();
    const solvedSnackbar: any = document.getElementById('solved-snackbar');
    solvedSnackbar.MaterialSnackbar.showSnackbar
      ({ message: 'Found', timeout: 1500 });
    setTimeout(nextQuiz, 1400);
  }
}

function updateDisp(strings: string[], id: string) {
  let state = { isAllMatched: true, isAllUnmatched: true };
  const div = document.getElementById(id);
  div.innerHTML = '';
  _.forEach(strings, s => {
    let matchRsl: string;
    if (testRegexp == null) {
      matchRsl = `
      <i class="material-icons" style="color:sandybrown">fullscreen</i>
      <span style="color:sandybrown; font-size:10px">Invalid</span>
      `;
      state.isAllMatched = state.isAllUnmatched = false;
    } else if (testRegexp.test(s)) {
      matchRsl = `
      <i class="material-icons" style="color:lawngreen">check</i>
      <span style="color:lawngreen; font-size:10px">Matched</span>
      `;
      state.isAllUnmatched = false;
    } else {
      matchRsl = `
      <i class="material-icons" style="color:orangered">close</i>
      <span style="color:orangered; font-size:10px">Unmatched</span>
      `;
      state.isAllMatched = false;
    }
    const isMatched = testRegexp
    const l = document.createElement('div');
    l.innerHTML = `
    <div class="mdl-grid" style="padding: 0px">
    <div class="mdl-cell mdl-cell--6-col">
    ${matchRsl}
    </div>
    <div class="mdl-cell mdl-cell--6-col" style="color:black; font-size:16px">
    ${s}
    </div>
    </div>
    `;
    div.appendChild(l);
  });
  return state;
}
