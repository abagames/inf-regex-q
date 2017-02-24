import * as _ from 'lodash';
import RandExp = require('randexp');
import Random from './random';

RandExp.prototype.randInt = (from, to) => random.getInt(from, to);

window.onload = init;

let random: Random;
let matchStrings: string[];
let unmatchStrings: string[];
let regexpInput: HTMLInputElement;
let ansLength: number;
let genStringsCount: number;

function init() {
  random = new Random();
  regexpInput = <HTMLInputElement>document.getElementById('regexp_input');
  regexpInput.onkeydown = updateRegexpInput;
  regexpInput.onkeyup = updateRegexpInput;
  genQuiz(random.getToMaxInt());
}

function genQuiz(seed: number) {
  random.setSeed(seed);
  let ans: string;
  let ansExp: RegExp;
  for (let i = 0; i < 10; i++) {
    ans = genPattern(random.getInt(3, 10));
    try {
      ansExp = new RegExp(ans);
    } catch (e) {
      ans = null;
      continue;
    }
    genStrings(ansExp);
    if (matchStrings.length < 1 || matchStrings.length > genStringsCount - 1) {
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
  testRegexp = new RegExp('');
  ansLength = ans.length;
  regexpInput.setAttribute('maxlength', `${ansLength}`);
  updateDisps();
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
      matchStrings.push(s);
    } else {
      unmatchStrings.push(s);
    }
  });
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
  updateDisp(matchStrings, 'match');
  updateDisp(unmatchStrings, 'unmatch');
  document.getElementById('input_count').textContent =
    `${prevRegexpInput.length} / ${ansLength}`
}

function updateDisp(strings: string[], id: string) {
  const div = document.getElementById(id);
  div.innerHTML = '';
  _.forEach(strings, s => {
    let matchRsl: string;
    if (testRegexp == null) {
      matchRsl = `
      <i class="material-icons" style="color:sandybrown">fullscreen</i>
      <span style="color:sandybrown; font-size:10px">Invalid</span>
      `;
    } else if (testRegexp.test(s)) {
      matchRsl = `
      <i class="material-icons" style="color:lawngreen">check</i>
      <span style="color:lawngreen; font-size:10px">Matched</span>
      `;
    } else {
      matchRsl = `
      <i class="material-icons" style="color:orangered">close</i>
      <span style="color:orangered; font-size:10px">Unmatched</span>
      `;
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
}
