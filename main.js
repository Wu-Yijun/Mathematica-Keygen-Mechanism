// --- Magic Numbers ---

const hasher1_code = 0b1000001011100001;
const hasher2_code = 0b1000001100100101;

// others magic numbers are not being tested and may not work
const magicNumbers = [
  // 10690, 12251, 17649, 24816, 33360, 35944, 36412,
  // 42041, 42635, 44011,
  // 53799, 56181, 58536,
  59222,
  // 61041
];

// --- Functions ---

/**
 * Hasher function to encode the given byte to the hash.
 * @param {Number} hasher_code Hasher code
 * @param {Number} hash Initial hash
 * @param {Number} byte Char code to be encoded
 * @returns
 */
function hasher(hasher_code, hash, byte) {
  for (let i = 0; i < 8; i += 1, byte >>= 1) {
    const bit = byte & 1;
    if (hash % 2 === bit) {
      hash >>= 1;
    } else {
      hash >>= 1;
      hash ^= hasher_code;
    }
  }
  return hash;
}

/**
 * Split the given hex number to 5 digits.
 * @param {Number} hex
 * @returns {Array<Number>} 5 digits
 */
function split_hex(hex) {
  var n = Math.floor(hex * 99999.0 / 0xFFFF);
  var slice = [];
  for (let i = 0; i < 5; i++) {
    slice.push(n % 10);
    n = Math.floor(n / 10);
  }
  return slice;
}

/**
 * Encode the given number to the hash.
 * @param {Number} n1 Number to be encoded
 * @returns {Number} Encoded hash
 */
function encoding_hash(n1) {
  n1 = Math.floor(n1 * 99999.0 / 0xFFFF);
  const n1_01 = n1 % 100;
  n1 -= n1_01;
  const n1_2 = n1 % 1000;
  n1 -= n1_2;
  n1 += n1_01 * 10 + n1_2 / 100;
  const temp = Math.ceil(n1 * 65535.0 / 99999);
  return hasher(hasher2_code, hasher(hasher2_code, 0, temp & 0xFF), temp >> 8);
}

/**
 * Find the magic character for the given hash.
 * @param {Number} hasher_code Hasher code
 * @param {Number} hash Initial hash
 * @param {Number} target Target hash
 * @returns {Number} Magic number
 */
function find_magic_char(hasher_code, hash, target) {
  var c1 = 0, c2 = 0;
  for (c1 = 0; c1 < 256; c1++) {
    for (c2 = 0; c2 < 256; c2++) {
      if (hasher(hasher_code, hasher(hasher_code, hash, c1), c2) === target) {
        return c1 | c2 << 8;
      }
    }
  }
  return c1 | c2 << 8;
}

/**
 * Encode the given characters to the hash.
 * @param {Number} hasher_code Hasher code
 * @param {Number} hash Initial hash
 * @param {Array<Number>} characters String to be encoded
 * @returns {Number} Magic number
 */
function encoding_characters(hasher_code, hash, characters) {
  for (let char of characters) {
    hash = hasher(hasher_code, hash, char);
  }
  return find_magic_char(hasher_code, hash, 0xA5B6);
}

/**
 * Test if the given characters are valid for the hash.
 * @param {Number} hasher_code Hasher code
 * @param {Number} hash Initial hash
 * @param {Array<Number>} characters String to be tested
 * @param {Number} target Target hash
 * @returns {Boolean} True if the characters are valid
 */
function decoding_characters(hasher_code, hash, characters, target) {
  for (let char of characters) {
    hash = hasher(hasher_code, hash, char);
  }
  const c1 = target & 0xFF;
  const c2 = target >> 8;
  return hasher(hasher_code, hasher(hasher_code, hash, c1), c2) === 0xA5B6;
}

/**
 * Construct a password from the given magic numbers.
 * @param {Number} n1 n1
 * @param {Number} n2 n2
 * @returns {String} Constructed Password
 */
function construct_password(n1, n2) {
  const n1str = split_hex(n1).reverse();
  const n2str = split_hex(n2).reverse();
  return '' + n2str[3] + n1str[3] + n1str[1] + n1str[0] + '-' + n2str[4] +
      n1str[2] + n2str[0] + '-' + n2str[2] + n1str[4] + n2str[1];
}

/**
 * Extract the magic numbers from the password.
 * @param {String} password Password to be extracted
 * @returns {Array<Number>} [n1, n2]
 */
function extract_password(password) {
  const n1 = parseInt(
      password[3] + password[2] + password[6] + password[1] + password[10]);
  const n2 = parseInt(
      password[7] + password[11] + password[9] + password[0] + password[5]);
  return [Math.ceil(n1 * 65535.0 / 99999), Math.ceil(n2 * 65535.0 / 99999)];
}

/**
 * Generate a password for the given Math ID and magic number.
 * @param {String} str Math ID + '$1&' + Activation Key
 * @param {Number} hash magic number
 * @param {Number} mathNum Suffix to Math ID
 * @returns {String} Generated Password
 */
function generate_password(str, hash, mathNum = 1) {
  const characters = [...String(str)].reverse().map((c) => c.charCodeAt(0))
  const n0 = encoding_characters(hasher1_code, hash, characters);
  const n1 = (n0 + 0x72FA) % 65536;
  hash = encoding_hash(n1);
  const n2 = encoding_characters(hasher2_code, hash, characters);
  // console.log(n0, n1, n2);
  return construct_password(n1, n2) + '::' + mathNum;
}

/**
 * Check if the password is valid.
 * @param {String} str Math ID + '$1&' + Activation Key
 * @param {Number} hash magic number
 * @param {String} password Password to be checked
 * @param {Number} mathNum Suffix to Math ID
 * @returns {Boolean} True if the password is valid
 */
function check_password(str, hash, password, mathNum = 1) {
  if (!check_format('XXXX-XXX-XXX::' + mathNum, password)) {
    console.warn('Invalid Password Format');
    return false;
  }
  const [n1, n2] = extract_password(password);
  const n0 = (n1 + 0x8D06) % 65536;
  const hash1 = hash;
  const hash2 = encoding_hash(n1);
  const characters = [...String(str)].reverse().map((c) => c.charCodeAt(0));
  const test1 = decoding_characters(hasher1_code, hash1, characters, n0);
  const test2 = decoding_characters(hasher2_code, hash2, characters, n2);
  if (!test1 || !test2) {
    console.warn('Failed to verify the password');
    return false;
  }
  return true;
}

/**
 * Randomly fills the 'X' in given format with numbers.
 * @param {string} format Format with 'X' to be filled
 * @returns {string} Randomly filled string
 *
 * @example
 * random_fill('XXXX-XXXX-XXXXXX') => '1234-5678-901234'
 */
function random_fill(format) {
  return format.replace(/X/g, () => Math.floor(Math.random() * 10));
}

/**
 * Checks if the given string is corresponding to the format.
 * @param {string} format Format with 'X' to be checked
 * @param {string} s String to be checked by the format
 * @returns {boolean} True if the string is corresponding to the format
 *
 * @example
 * check_format('XXXX-XXXX-XXXXXX', '1234-5678-901234') => true
 */
function check_format(format, s) {
  if (format.length !== s.length) return false;
  for (let i = 0; i < format.length; i++) {
    if (format[i] === 'X') {
      if ('0123456789'.search(s[i]) < 0) return false;
    } else {
      if (format[i] !== s[i]) return false;
    }
  }
  return true;
}

/**
 * Main function to generate a password.
 * @param {string} id Math ID
 * @param {Number} suffix Suffix to Math ID
 * @param {Number} generate_number Number of passwords to be generated
 * @returns {{mathId: string, activationKey: string, password: string}}
 *     Generated Password
 *
 * The suffix may determine the function of Mathematica.
 * For example, the suffix 1 may be used for the `Standard version`.
 * The suffix 255 may be used for the `Wolfram Player Pro`.
 * The suffix 65535 may be used for the `Student version`.
 *
 */
function main(id, suffix = 1, generate_number = 6) {
  const mathId = String(id);
  const mathNum = typeof (suffix) === 'number' ? suffix : 1;
  if (!check_format('XXXX-XXXXX-XXXXX', mathId)) {
    console.warn('Invalid Math ID');
  }
  var i = 1;
  while (true) {
    const activationKey = '8778-0608-QAJYEG';
    // const activationKey = random_fill('XXXX-XXXX-XXXXXX');
    const magicNumber =
        magicNumbers[Math.floor(Math.random() * magicNumbers.length)];
    const str = mathId + '$' + mathNum + '&' + activationKey;
    console.log('Generating Password for:', str);
    const password = generate_password(str, magicNumber, mathNum);
    if (!check_format('XXXX-XXX-XXX::X', password)) {
      console.warn('Failed to generate a Valid Password');
    }
    console.log('<---- Group: ', i, '---->');
    console.log('Math ID:', mathId, ' with ', mathNum);
    console.log('Activation Key:', activationKey);
    console.log('Password:', password);
    check_password(str, magicNumber, password, mathNum);
    if (++i > generate_number) {
      return {mathId, activationKey, password};
    }
  }
}



// export default main;
// export {main, check_password, generate_password, check_format, random_fill};

window.MMA = {
  main,
  check_password,
  generate_password,
  check_format,
  random_fill
};

/* mathpass
%(*userregistered*)
laptop-j851nhdo		8778-0608-QAJYEG	1859-585-737::80000D:20250427
*/
(function() {
const mathId = '6205-86227-45728';
const activationKey = '8778-0608-QAJYEG';
const mathNum = '80000D';
const magicNumber =
    magicNumbers[Math.floor(Math.random() * magicNumbers.length)];
const str = mathId + '$' + mathNum + '&' + activationKey;
console.log('Generating Password for:', str);
const password = '1859-585-737::80000D:20250427';
check_password(str, magicNumber, password, mathNum);
debugger
})();