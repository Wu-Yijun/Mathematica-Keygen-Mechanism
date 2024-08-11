
function hideUserAgreement(num) {
  document.getElementById('UserAgreement').style.display = 'none';
  document.getElementById('UserAgreementSep').style.display = 'none';
  document.getElementById('UserAgreementTip').style.display = 'none';
  localStorage['user-agreement'] = num;
}

if (localStorage['user-agreement'] &&
    parseInt(localStorage['user-agreement']) > 0) {
  hideUserAgreement(localStorage['user-agreement']);
}

function cyrb128(str) {
  let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
  for (let i = 0, k; i < str.length; i++) {
    k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= (h2 ^ h3 ^ h4), h2 ^= h1, h3 ^= h1, h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

function sfc32(a, b, c, d) {
  return function() {
    a |= 0;
    b |= 0;
    c |= 0;
    d |= 0;
    let t = (a + b | 0) + d | 0;
    d = d + 1 | 0;
    a = b ^ b >>> 9;
    b = c + (c << 3) | 0;
    c = (c << 21 | c >>> 11);
    c = c + t | 0;
    return (t >>> 0);
  }
}

/**
 * Generate random number from seed
 *
 * @param {String} seed  The seed to generate random number
 * @returns {Number}  The random number
 */
function random_function(seed) {
  var hashs = cyrb128(JSON.stringify(seed));
  var seed_fun = sfc32(hashs[0], hashs[1], hashs[2], hashs[3]);
  var count = seed_fun() % 100;
  var random = seed_fun();
  for (var i = 0; i < count; i++) {
    random ^= seed_fun();
  }
  return random;
}

const today = new Date();
if (random_function(today.toDateString()) % 2 == 0) {
  document.body.style.backgroundColor = 'azure';
}

function copy(id) {
  const text = document.getElementById(id).innerText;
  navigator.clipboard.writeText(text)
      .then(() => {
        console.log('Text copied to clipboard: ', text);
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
      });
}
function paste(id) {
  navigator.clipboard.readText()
      .then(text => {
        document.getElementById(id).innerText = text;
        console.log('Pasted text from clipboard: ', text);
      })
      .catch(err => {
        console.error('Failed to read clipboard contents: ', err);
      });
}


{
  let selectors = document.getElementsByClassName('selector');
  for (let i = 0; i < selectors.length; i++) {
    const selector = selectors[i];
    const to_select = (i) => {
      const old = selector.children[selector.getAttribute('value')];
      old && old.classList.remove('selected');
      selector.setAttribute('value', i);
      selector.children[i].classList.add('selected');
    };
    //  selector.childNodes
    for (let j = 0; j < selector.childElementCount; j++) {
      const option = selector.children[j];
      option.classList.add('option');
      option.addEventListener('click', () => {
        to_select(j);
      });
    }
    to_select(0);
  }
}
{
  let textareas = document.getElementsByClassName('textarea');
  for (let i = 0; i < textareas.length; i++) {
    const textarea = textareas[i];
    const default_text = textarea.getAttribute('default');
    if (default_text) {
      textarea.innerText = default_text;
      textarea.style.color = 'gray';
      textarea.addEventListener('focus', () => {
        if (textarea.innerText === default_text) {
          textarea.innerText = '';
          textarea.style.color = 'black';
        }
      });
      textarea.addEventListener('blur', () => {
        if (textarea.innerText === '') {
          textarea.innerText = default_text;
          textarea.style.color = 'gray';
        }
      });
    }
  }
}



function generatePassword() {
  function setText(id, text) {
    document.getElementById(id).innerText = text;
    document.getElementById(id).style.color = 'black';
  }
  const sel = document.getElementById('version');
  var version = '14.1.0';
  if (sel.getAttribute('value') === 0 || sel.getAttribute('value') === '0') {
    version = '14.1.0';
  } else if (
      sel.getAttribute('value') === 1 || sel.getAttribute('value') === '1') {
    version = '14.0.0';
  } else {
    const ver = document.getElementById('version-input');
    version = ver.innerText || ver.getAttribute('default') || '14.1.0';
  }
  const math_id = document.getElementById('math-id');
  var math_text = math_id.innerText;
  if (math_text === math_id.getAttribute('default')) {
    console.warn('Please input your own Math Id!!');
    return;
  }
  if (!MathPass.check_format('xxxx-xxxxx-xxxxx', math_text)) {
    console.error('Invalid Math Id Format');
    console.info('Should be xxxx-xxxxx-xxxxx');
    return;
  }
  const mathpass = new MathPass(math_text, version);
  console.info('Version:', mathpass.version);
  console.info('Math ID:', mathpass.math_id);

  const mky = document.getElementById('math-key')
  var activation_key = mky.innerText;
  const activation_key_format = mathpass.activation_key_format();
  if (activation_key.length === 0 ||
      activation_key === mky.getAttribute('default')) {
    activation_key = activation_key_format;
  }
  if (!MathPass.check_format(activation_key_format, activation_key, false)) {
    console.error('Invalid Activation Key Format');
    console.info('Should be ' + activation_key_format);
    return;
  }
  activation_key = MathPass.random_fill(activation_key);
  if (!mathpass.set_activation_key(activation_key)) {
    console.error('Error Set Activation Key');
    return;
  }
  console.info('Activation Key:', mathpass.activation_key);

  if (!document.getElementById('advanced').classList.contains('card-hide')) {
    var math_num = document.getElementById('math-num').innerText;
    math_num = MathPass.random_fill(math_num);
    var expire_date = document.getElementById('math-date').innerText;
    expire_date = MathPass.random_fill(expire_date);
    var initial_hash = document.getElementById('math-hash').innerText;
    initial_hash = MathPass.random_fill(initial_hash);
    mathpass.set_hash(parseInt(initial_hash));

    console.info('Math Num:', math_num);
    console.info('Expire Date:', expire_date);
    console.info('Initial Hash:', initial_hash);

    if (!mathpass.generate_password(math_num, expire_date)) {
      console.error('Cannot generate password with: ', mathpass);
      return;
    }
  } else if (!mathpass.generate_password()) {
    console.error('Cannot generate password with: ', mathpass);
    return;
  }
  console.info('Password:', mathpass.password);

  setText('math-id', mathpass.math_id);
  setText('math-key', mathpass.activation_key);
  setText('math-pass', mathpass.password);

  console.log('Password successfully generated !');
}

function clearActivationKey(id) {
  const elem = document.getElementById(id);
  const txt = elem.getAttribute('default');
  if (txt) {
    elem.innerText = txt;
    elem.style.color = 'grey';
  } else {
    elem.innerText = '';
  }
}

// 设置点击折叠功能
for (let element of document.getElementsByClassName('card-header')) {
  element.addEventListener('click', () => {
    element.classList.toggle('card-hide');
  });
}

function crackInitialHash() {
  var version = '14.1.0';
  const sel = document.getElementById('version');
  if (sel.getAttribute('value') === 0 || sel.getAttribute('value') === '0') {
    version = '14.1.0';
  } else if (
      sel.getAttribute('value') === 1 || sel.getAttribute('value') === '1') {
    version = '14.0.0';
  } else {
    const ver = document.getElementById('version-input');
    version = ver.innerText || ver.getAttribute('default') || '14.1.0';
  }
  const math_id = document.getElementById('math-id').innerText;
  const math_key = document.getElementById('math-key').innerText;
  const math_pass = document.getElementById('math-pass').innerText;

  const mathpass = new MathPass(math_id, version);
  mathpass.set_activation_key(math_key);


  var initial_hashs = `Crack from Version:\t${mathpass.version}
Math ID:\t${mathpass.math_id}
Activation Key:\t${mathpass.activation_key}
Password:\t${math_pass}
Initial Hash:\t`;
  for (let i = 0; i < 65536; i++) {
    if (mathpass.check_password(math_pass, i, true)) {
      console.info('Initial Hash:', i);
      initial_hashs += i + '\n';
    }
  }
  document.getElementById('result').innerText = initial_hashs;
}