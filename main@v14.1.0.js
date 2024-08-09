(function(global, factory) {
if (typeof module === 'object' && typeof module.exports === 'object') {
  // CommonJS 环境
  module.exports = factory();
} else if (typeof define === 'function' && define.amd) {
  // AMD 环境
  define(factory);
} else {
  // 浏览器环境，全局变量方式
  global.MathPass = factory();
}
}(typeof window !== 'undefined' ? window : this, function() {

/**
 * MathPass class to generate and check passwords.
 * @class MathPass
 * @version 14.1.0 (2021-08-01)
 * @author Yijun Wu
 * @license MIT
 *
 *
 * @example // a simple example
 * const maptpass = new MathPass('6205-86227-45728', '14.1.0');
 * maptpass.set_activation_key('6038-4883-ABCDEF');
 * maptpass.generate_password('800001', '20280101');
 * maptpass.check_password();
 * console.log(maptpass);
 * console.log(maptpass.search_hasher());
 *
 * @example // an example with old version
 * const maptpass_old = new MathPass('6205-86227-45728', '13.15.0');
 * maptpass_old.set_activation_key('6038-4883-111111');
 * maptpass_old.generate_password('1');
 * maptpass_old.check_password();
 * console.log(maptpass_old);
 */
class MathPass {
  constructor(
      math_id,
      version = '14.1.0',
  ) {
    this.version = MathPass.get_version_code(version);
    this.set_math_id(math_id)
    this.activation_key = MathPass.random_activation_key();
    MathPass.hash = 24816;
    this.password = '';
  }


  static HASH_CODE_1 = 0b1000001011100001;
  static HASH_CODE_2 = 0b1000001100100101;

  // others magic numbers are not being tested and may not work
  static MAGIC_NUMBER_LIST = [
    // 10690, 12251, 17649,
    24816,
    // 33360, 35944, 36412,
    // 42041, 42635, 44011,
    // 53799, 56181, 58536,
    59222,
    // 61041
  ];

  /**
   * Compare the version of the MathPass library with the given version.
   * Returns true if the version is greater or equal to the given version.
   *
   * @param {Number} major Major version
   * @param {Number} minor Minor version
   * @param {Number} patch Patch version
   * @returns {Boolean} True if the version is greater or equal to the given
   */
  version_compare(major, minor = 0, patch = 0) {
    return this.version[0] > major ||
        (this.version[0] === major && this.version[1] > minor) ||
        (this.version[0] === major && this.version[1] === minor &&
         this.version[2] >= patch);
  }
  activation_key_format(){
    if(this.version_compare(14,1,0)){
      return 'xxxx-xxxx-aaaaaa';
    }else{
      return 'xxxx-xxxx-xxxxxx';
    }
  }


  search_hasher(password = this.password, max_hasher = 65536) {
    var result = [];
    for (let i = 0; i < max_hasher; i++) {
      if (this.check_password(password, i, true)) {
        result.push(i);
      }
    }
    return result;
  }
  check_password(password = this.password, hash = MathPass.hash, mute = false) {
    if (this.version_compare(14, 1, 0)) {
      return this.#check_password_v14_1_0(password, hash, mute);
    } else {
      return this.#check_password_v14_0_0(password, hash, mute);
    }
  }
  #check_password_v14_1_0(password, hash, mute) {
    if (!MathPass.check_format('xxxx-xxx-xxx::bbbbbb:xxxxxxxx', password)) {
      if (mute) return false;
      console.warn('Invalid Password Format');
      console.log(
          'Password should be in the format: xxxx-xxx-xxx::bbbbbb:xxxxxxxx');
      return false;
    }
    const [pass, , mathNum, expireDate] = password.split(':');
    const str = this.math_id + '@' + expireDate + '$' + mathNum + '&' +
        this.activation_key;
    const [n1, n2] = MathPass.#extract_password(pass);
    const n0 = (n1 + 0x8D06) % 65536;
    const hash1 = hash;
    const hash2 = MathPass.#encoding_hash(n1);
    const characters = [...String(str)].reverse().map((c) => c.charCodeAt(0));
    const test1 = MathPass.#decoding_characters(
        MathPass.HASH_CODE_1, hash1, characters, n0);
    const test2 = MathPass.#decoding_characters(
        MathPass.HASH_CODE_2, hash2, characters, n2);
    if (!test1 || !test2) {
      if (mute) return false;
      console.warn('The password is not valid');
      return false;
    }
    return true;
  }
  #check_password_v14_0_0(password, hash, mute) {
    const [pass, mathNum] = password.split('::');
    if (!MathPass.check_format('xxxx-xxx-xxx', pass)) {
      if (mute) return false;
      console.warn('Invalid Password Format');
      console.log('Password should be in the format: xxxx-xxx-xxx::[Math Num]');
      return false;
    }
    const str = this.math_id + '$' + mathNum + '&' + this.activation_key;
    const [n1, n2] = MathPass.#extract_password(pass);
    const n0 = (n1 + 0x8D06) % 65536;
    const hash1 = hash;
    const hash2 = MathPass.#encoding_hash(n1);
    const characters = [...String(str)].reverse().map((c) => c.charCodeAt(0));
    const test1 = MathPass.#decoding_characters(
        MathPass.HASH_CODE_1, hash1, characters, n0);
    const test2 = MathPass.#decoding_characters(
        MathPass.HASH_CODE_2, hash2, characters, n2);
    if (!test1 || !test2) {
      if (mute) return false;
      console.warn('The password is not valid');
      return false;
    }
    return true;
  }
  generate_password(
      math_num = '800001', expire_date = MathPass.get_date_after(999)) {
    if (this.version_compare(14, 1, 0)) {
      return this.#generate_password_v14_1_0(math_num, expire_date);
    } else {
      return this.#generate_password_v14_0_0(math_num);
    }
  }
  #generate_password_v14_1_0(math_num, expire_date) {
    if (!MathPass.check_format('bbbbbb', math_num) &&
        '1248'.includes(math_num[0])) {
      console.warn('Invalid Math Num Format');
      console.log('Math Num should be in the format: bbbbbbb');
      console.log('The first character should be 1, 2, 4, or 8');
      return false;
    }
    const str = this.math_id + '@' + expire_date + '$' + math_num + '&' +
        this.activation_key;
    const characters = [...String(str)].reverse().map((c) => c.charCodeAt(0))
    var hash = MathPass.hash;
    const n0 =
        MathPass.#encoding_characters(MathPass.HASH_CODE_1, hash, characters);
    const n1 = (n0 + 0x72FA) % 65536;
    hash = MathPass.#encoding_hash(n1);
    const n2 =
        MathPass.#encoding_characters(MathPass.HASH_CODE_2, hash, characters);
    this.password = MathPass.#construct_password(n1, n2) + '::' + math_num +
        ':' + expire_date;
    return true;
  }
  #generate_password_v14_0_0(math_num) {
    const str = this.math_id + '$' + math_num + '&' + this.activation_key;
    const characters = [...String(str)].reverse().map((c) => c.charCodeAt(0))
    var hash = MathPass.hash;
    const n0 =
        MathPass.#encoding_characters(MathPass.HASH_CODE_1, hash, characters);
    const n1 = (n0 + 0x72FA) % 65536;
    hash = MathPass.#encoding_hash(n1);
    const n2 =
        MathPass.#encoding_characters(MathPass.HASH_CODE_2, hash, characters);
    this.password = MathPass.#construct_password(n1, n2) + '::' + math_num;
    return true;
  }
  set_hash(hash) {
    MathPass.hash = hash;
  }
  set_math_id(math_id) {
    if (MathPass.check_format('xxxx-xxxxx-xxxxx', math_id)) {
      this.math_id = math_id;
      return true;
    }
    console.warn('Invalid Math ID Format');
    console.log('Math ID should be in the format: xxxx-xxxxx-xxxxx');
    return false;
  }
  set_password(password) {
    if (this.check_password(password)) {
      this.password = password;
      return true;
    }
    console.warn('Invalid Password');
    return false;
  }
  set_activation_key(activation_key) {
    if (this.check_activation_key(activation_key)) {
      this.activation_key = activation_key;
      return true;
    }
    console.warn('Invalid Activation Key Format');
    console.log('Activation Key should be in the format: xxxx-xxxx-aaaaaa');
    return false;
  }
  check_activation_key(activation_key = this.activation_key) {
    if (this.version_compare(14, 1, 0)) {
      return MathPass.check_format('xxxx-xxxx-aaaaaa', activation_key);
    } else {
      return MathPass.check_format('xxxx-xxxx-xxxxxx', activation_key);
    }
  }


  /**
   * Hasher function to encode the given byte to the hash.
   * @param {Number} hasher_code Hasher code
   * @param {Number} hash Initial hash
   * @param {Number} byte Char code to be encoded
   * @returns
   */
  static #hasher(hasher_code, hash, byte) {
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
  static #split_hex(hex) {
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
  static #encoding_hash(n1) {
    n1 = Math.floor(n1 * 99999.0 / 0xFFFF);
    const n1_01 = n1 % 100;
    n1 -= n1_01;
    const n1_2 = n1 % 1000;
    n1 -= n1_2;
    n1 += n1_01 * 10 + n1_2 / 100;
    const temp = Math.ceil(n1 * 65535.0 / 99999);
    return MathPass.#hasher(
        MathPass.HASH_CODE_2,
        MathPass.#hasher(MathPass.HASH_CODE_2, 0, temp & 0xFF), temp >> 8);
  }

  /**
   * Find the magic character for the given hash.
   * @param {Number} hasher_code Hasher code
   * @param {Number} hash Initial hash
   * @param {Number} target Target hash
   * @returns {Number} Magic number
   */
  static #find_magic_char(hasher_code, hash, target) {
    var c1 = 0, c2 = 0;
    for (c1 = 0; c1 < 256; c1++) {
      for (c2 = 0; c2 < 256; c2++) {
        if (MathPass.#hasher(
                hasher_code, MathPass.#hasher(hasher_code, hash, c1), c2) ===
            target) {
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
  static #encoding_characters(hasher_code, hash, characters) {
    for (let char of characters) {
      hash = MathPass.#hasher(hasher_code, hash, char);
    }
    return this.#find_magic_char(hasher_code, hash, 0xA5B6);
  }

  /**
   * Test if the given characters are valid for the hash.
   * @param {Number} hasher_code Hasher code
   * @param {Number} hash Initial hash
   * @param {Array<Number>} characters String to be tested
   * @param {Number} target Target hash
   * @returns {Boolean} True if the characters are valid
   */
  static #decoding_characters(hasher_code, hash, characters, target) {
    for (let char of characters) {
      hash = MathPass.#hasher(hasher_code, hash, char);
    }
    const c1 = target & 0xFF;
    const c2 = target >> 8;
    return MathPass.#hasher(
               hasher_code, MathPass.#hasher(hasher_code, hash, c1), c2) ===
        0xA5B6;
  }

  /**
   * Construct a password from the given magic numbers.
   * @param {Number} n1 n1
   * @param {Number} n2 n2
   * @returns {String} Constructed Password
   */
  static #construct_password(n1, n2) {
    const n1str = this.#split_hex(n1).reverse();
    const n2str = this.#split_hex(n2).reverse();
    return '' + n2str[3] + n1str[3] + n1str[1] + n1str[0] + '-' + n2str[4] +
        n1str[2] + n2str[0] + '-' + n2str[2] + n1str[4] + n2str[1];
  }

  /**
   * Extract the magic numbers from the password.
   * @param {String} password Password to be extracted
   * @returns {Array<Number>} [n1, n2]
   */
  static #extract_password(password) {
    const n1 = parseInt(
        password[3] + password[2] + password[6] + password[1] + password[10]);
    const n2 = parseInt(
        password[7] + password[11] + password[9] + password[0] + password[5]);
    return [Math.ceil(n1 * 65535.0 / 99999), Math.ceil(n2 * 65535.0 / 99999)];
  }

  /**
   * Randomly fills the 'x' in given format with numbers.
   * @param {string} format Format with 'x' to be filled with numbers, 'a' with
   *     characters (A-Z), 'b' with x or a
   * @returns {string} Randomly filled string
   *
   * @example
   * random_fill('xxxx-xxxx-aaaaaa') => '1234-5678-ABCDEFF'
   */
  static random_fill(format) {
    return format  // format control
        .replace(
            /x/g, () => Math.floor(Math.random() * 10))  // fill with numbers
        .replace(                                        // fill with characters
            /a/g,
            () => String.fromCharCode(65 + Math.floor(Math.random() * 26)))
        .replace(/b/g, () => {  // fill with numbers or characters
          return Math.random() > 0.722 ?
              Math.floor(Math.random() * 10) :
              String.fromCharCode(65 + Math.floor(Math.random() * 26));
        });
  }

  /**
   * Checks if the given string is corresponding to the format.
   * @param {string} format Format with 'x' to be checked with numbers, 'a' with
   *     characters (A-Z), 'b' with x or a
   * @param {string} s String to be checked by the format
   * @param {boolean} exact Accept 'a', 'b' or 'x' if disabled
   * @returns {boolean} True if the string is corresponding to the format
   *
   * @example
   * check_format('xxxx-xxxx-ABCaaa', '1234-5678-ABCDEF') => true
   */
  static check_format(format, s, exact = true) {
    if (format.length !== s.length) return false;
    for (let i = 0; i < format.length; i++) {
      if (format[i] === 'x') {
        if (exact || s[i] !== 'x')
          if (s[i] < '0' || s[i] > '9') return false
      } else if (format[i] === 'a') {
        if (exact || s[i] !== 'a')
          if (s[i] < 'A' || s[i] > 'Z') return false;
      } else if (format[i] === 'b') {
        if (exact || s[i] !== 'b')
          if ((s[i] < '0' || s[i] > '9') && (s[i] < 'A' || s[i] > 'Z'))
            return false;
      } else {
        if (format[i] !== s[i]) return false;
      }
    }
    return true;
  }


  static random_activation_key() {
    return MathPass.random_fill('xxxx-xxxx-aaaaaa');
  }
  static get_version_code(version) {
    const [major, minor, patch] = version.split('.').map(Number);
    return [major || 14, minor || 0, patch || 0];
  }
  static get_date_after(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);  // 获取年、月、日
    const year = date.getFullYear();
    const month = (date.getMonth() + 1)
                      .toString()
                      .padStart(2, '0');  // 月份从0开始，所以要加1
    const day = date.getDate().toString().padStart(2, '0');
    return year + month + day;
  }
}
return MathPass;
}));


// 在 ES6 模块环境中导出
// export default MathPass;