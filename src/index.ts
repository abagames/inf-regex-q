import * as _ from 'lodash';
import RandExp = require('randexp');
import Random from './random';

RandExp.prototype.randInt = (from, to) => random.getInt(from, to);

window.onload = init;

const currentVersion = '12';
const validSeed = 0;
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
let quizSeed: number;
let elapsedTime: number;
const totalQuizCount = 10;

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
  quizTimeInterval = setInterval(updateQuizTime, 1000);
  updateQuizTime();
}

function checkQuery() {
  const query = window.location.search.substring(1);
  if (query == null) {
    return false;
  }
  let params = query.split('&');
  let _version: string;
  let _seed: string;
  let _time: number;
  _.forEach(params, param => {
    const pair = param.split('=');
    if (pair[0] === 'v') {
      _version = pair[1];
    } else if (pair[0] === 's') {
      _seed = pair[1];
    } else if (pair[0] === 't') {
      _time = Number(pair[1]);
    }
  });
  if (_seed == null) {
    return false;
  }
  nextQuiz(Number(_seed), _version);
  if (_time != null) {
    endQuiz(_time, _version);
  }
}

function nextQuiz(seed: number = null, version: string = currentVersion) {
  quizCount++;
  if (quizCount > totalQuizCount) {
    endQuiz();
    return;
  }
  dispNextQuiz();
  if (seed == null) {
    seed = quizRandom.getToMaxInt();
  }
  genQuiz(seed, version);
  createUrl(version);
  regexpInput.focus();
}

function dispNextQuiz() {
  const qd = document.getElementById('quiz_count');
  qd.textContent = `Q.${quizCount}`;
  hidePassButton();
  showingPassButtonTimeout = setTimeout(() => {
    passButton.style.visibility = 'visible';
  }, 30 * 1000);
  regexpInput.value = prevRegexpInput = '';
  regexpInput.removeAttribute('disabled');
  testRegexp = new RegExp('');
}

function genQuiz(seed: number, version: string) {
  quizSeed = seed;
  random.setSeed(seed);
  let ans: string;
  let ansExp: RegExp;
  for (let i = 0; i < 1000; i++) {
    ans = genPattern(random.getInt(3, 10), version);
    try {
      ansExp = new RegExp(ans);
    } catch (e) {
      ans = null;
      continue;
    }
    genStrings(ansExp, ans, version);
    if (matchStrings.length < 2 || unmatchStrings.length < 2) {
      ans = null;
      continue;
    }
    if (Number(currentVersion) >= 12 && !checkStrings()) {
      ans = null;
      continue;
    }
    break;
  }
  if (ans === null) {
    genQuiz(validSeed, version);
    return;
  }
  ansLength = ans.length;
  regexpInput.setAttribute('maxlength', `${ansLength}`);
  updateDisps();
}

function genPattern(len: number, version: string) {
  const randChars = ['*', '+', '?', '.', '|'];
  let p = '';
  for (let i = 0; i < len; i++) {
    const pr = random.get();
    if (pr < 0.1) {
      const br = new RandExp(`\\^?[a-z0-9]{${random.getInt(2, 4)}}`).gen();
      p += `[${br}]`;
    } else if (pr < 0.2) {
      p += `{${random.getInt(2, 5)}}`;
    } else if (pr < 0.3) {
      const bl = random.getInt(1, len - i);
      p += `(${genPattern(bl, version)})`;
      i += bl;
    } else if (pr < 0.8) {
      p += randChars[random.getInt(randChars.length)];
    } else if (pr < 0.9) {
      p += String.fromCharCode('0'.charCodeAt(0) + random.getInt(10));
    } else {
      p += String.fromCharCode('a'.charCodeAt(0) + random.getInt(26));
    }
  }
  return p;
}

function genStrings(ansExp: RegExp, ans: string, version: string) {
  matchStrings = [];
  unmatchStrings = [];
  const randExp = new RandExp(ansExp);
  randExp.max = 3;
  genStringsCount = random.get(5, 11);
  let ansLetters = [];
  _.forEach(ans, c => {
    if (checkIsNumberOfAlphabet(c)) {
      ansLetters.push(c);
    }
  });
  if (ansLetters.length <= 0) {
    ansLetters.push('a');
  }
  _.times(genStringsCount, () => {
    let s: string = randExp.gen();
    _.times(random.getInt(0, 3), () => {
      const sp = random.getInt(s.length - 1);
      if (s.length >= 3 && random.get() < 0.5) {
        s = s.slice(0, sp) + s.slice(sp + 1);
      } else {
        const ac =
          version === '1' ? new RandExp(/[a-z0-9]/).gen() :
            ansLetters[random.getInt(ansLetters.length)];
        s = s.slice(0, sp) + ac + s.slice(sp);
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

function checkStrings() {
  let mws = createWords(matchStrings);
  const umws = createWords(unmatchStrings);
  mws = _.filter(mws, w => !_.some(umws, uw => w === uw));
  return mws.length <= 0;
}

function createWords(strings: string[]) {
  let ws = filterWords(strings[0]);
  for (let i = 1; i < strings.length; i++) {
    const nws = filterWords(strings[i]);
    ws = _.filter(ws, w => _.some(nws, nw => nw === w));
  }
  return ws;
}

function filterWords(s: string) {
  let ws = [];
  let w = '';
  _.forEach(s, c => {
    if (checkIsNumberOfAlphabet(c)) {
      w += c;
      addWord(ws, w);
    } else {
      w = '';
    }
  });
  return ws;
}

function addWord(ws: string[], w: string) {
  for (let i = 0; i < w.length; i++) {
    const pw = w.substr(i);
    if (!_.some(ws, w => w === pw)) {
      ws.push(pw);
    }
  }
}

function checkIsNumberOfAlphabet(c: string) {
  const cc = c.charCodeAt(0);
  return (cc >= '0'.charCodeAt(0) && cc <= '9'.charCodeAt(0)) ||
    (cc >= 'a'.charCodeAt(0) && cc <= 'z'.charCodeAt(0)) ||
    (cc >= 'A'.charCodeAt(0) && cc <= 'Z'.charCodeAt(0));
}

function endQuiz(time: number = null, version: string = currentVersion) {
  quizCount = totalQuizCount + 1;
  regexpInput.setAttribute('disabled', '');
  clearInterval(quizTimeInterval);
  updateQuizTime(time);
  const qd = document.getElementById('quiz_count');
  qd.textContent = `You found ${totalQuizCount} regexps in`;
  createUrl(version);
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
  _.forEach(strings, (s, i) => {
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
    <div id="${id}_${i}" class="mdl-cell mdl-cell--6-col" style="color:black; font-size:16px">
    </div>
    </div>
    `;
    div.appendChild(l);
    document.getElementById(`${id}_${i}`).textContent = s;
  });
  return state;
}

function updateQuizTime(time: number = null) {
  elapsedTime = time == null ? new Date().getTime() - quizBeginMills : time;
  let seconds = Math.floor(elapsedTime / 1000) % 60;
  let minutes = Math.floor(elapsedTime / (1000 * 60)) % 60;
  const td = document.getElementById('quiz_time');
  td.textContent =
    `${minutes < 10 ? '0' : ''}${minutes} : ${seconds < 10 ? '0' : ''}${seconds}`;
}

function hidePassButton() {
  if (showingPassButtonTimeout != null) {
    clearTimeout(showingPassButtonTimeout);
  }
  passButton.style.visibility = 'hidden';
  passButton.textContent = 'Pass';
}

function createUrl(version: string = currentVersion) {
  const baseUrl = window.location.href.split('?')[0];
  let url = `${baseUrl}?v=${version}&s=${quizSeed}`;
  if (quizCount > totalQuizCount) {
    url += `&t=${elapsedTime}`;
  }
  try {
    window.history.replaceState({}, '', url);
  } catch (e) { }
}
