var rules = {
  longVowelFallbackToPreviousKanaIsValid: true,
  allowNKana: true,
  smallKanaFallbackToPreviousKanaIsValid: true
};

function areWordsShiritoriCompliant (bef, aft) {
  var befHira = rmDakutenAndCapsSmallVowels(convertToHiragana(bef));
  var aftHira = rmDakutenAndCapsSmallVowels(convertToHiragana(aft));

  var isSmallKana = ['ゃ', 'ゅ', 'ょ'].indexOf(befHira[befHira.length - 1]) !== -1;
  var isLongVowel = 'ー' === befHira[befHira.length - 1];
  var endsInNG = 'ん' === befHira[befHira.length - 1];

  if (befHira.charCodeAt(befHira.length - 1) === aftHira.charCodeAt(0) ||
    (isLongVowel && convertLongVowelSignToVowel(befHira[befHira.length - 2]).charCodeAt(0) === aftHira.charCodeAt(0)) ||
    (rules.smallKanaFallbackToPreviousKanaIsValid && isSmallKana && befHira.charCodeAt(befHira.length - 2) === aftHira.charCodeAt(0) && befHira.charCodeAt(befHira.length - 1) === aftHira.charCodeAt(1)) ||
    (rules.longVowelFallbackToPreviousKanaIsValid && isLongVowel && befHira.charCodeAt(befHira.length - 2) === aftHira.charCodeAt(0)) ||
    (rules.allowNKana && endsInNG && ['ん', 'な', 'に', 'ぬ', 'ね', 'の'].indexOf(aftHira[0]))) {
    return true;
  }

  return false;
}

function convertToHiragana (word) {
  var newCodes = [];
  for (i in word) {
    if (word.charCodeAt(i) >= 0x30A1 && word.charCodeAt(i) <= 0x30FB) {
      newCodes[i] = word.charCodeAt(i) - 0x60;
    } else {
      newCodes[i] = word.charCodeAt(i);
    }
  }
  return String.fromCharCode.apply(null, newCodes);
}

function rmDakutenAndCapsSmallVowels (word) {
  var dakutenMap = [ ['あ', 'ぁ'], ['い', 'ぃ'], ['う', 'ぅ'], ['え', 'ぇ'], ['お', 'ぉ'],
    ['か', 'が'], ['き', 'ぎ'], ['く', 'ぐ'], ['け', 'げ'], ['こ', 'ご'], ['さ', 'ざ'], ['し', 'じ'],
    ['す', 'ず'], ['せ', 'ぜ'], ['そ', 'ぞ'], ['た', 'だ'], ['ち', 'ぢ'], ['つ', 'っ', 'づ'], ['て', 'で'],
    ['と', 'ど'], ['は', 'ば', 'ぱ'], ['ひ', 'び', 'ぴ'], ['ふ', 'ぶ', 'ぷ'], ['へ', 'べ', 'ぺ'], ['ほ', 'ぼ', 'ぽ'],
    ['う', 'ゔ'] ];
  var convertedWord = '';
  for (i in word) {
    var kana = word[i];
    var idx = dakutenMap.findIndex((item, idx) => {
      return item.indexOf(kana) !== -1;
    });
    convertedWord += idx !== -1 ? dakutenMap[idx][0] : word[i];
  }

  return convertedWord;
}

function convertLongVowelSignToVowel (beforeSign) {
  var hiraTable = [ ['あ', 'か', 'さ', 'た', 'な', 'は', 'ま', 'や', 'ら', 'わ'],
    ['い', 'き', 'し', 'ち', 'に', 'ひ', 'み', 'り'],
    ['う', 'く', 'す', 'つ', 'ぬ', 'ふ', 'む', 'ゆ'],
    ['え', 'け', 'せ', 'て', 'ね', 'へ', 'め', 'れ'],
    ['お', 'こ', 'そ', 'と', 'の', 'ほ', 'も', 'よ', 'ろ'] ];

  var convertedWord = '';
  var idx = hiraTable.findIndex((item, idx) => {
    return item.indexOf(beforeSign) !== -1;
  });
  convertedWord += idx !== -1 ? hiraTable[idx][0] : beforeSign;

  return convertedWord;
}

module.exports = areWordsShiritoriCompliant;
