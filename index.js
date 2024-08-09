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

  const mathNum = '800001';
  if (!mathpass.generate_password(mathNum)) {
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