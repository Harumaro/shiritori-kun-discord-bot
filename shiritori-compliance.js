var rules = {
  nNotALosingKana: true,
  smallKanaFallbackToPreviousKanaIsValid: true
};

function areWordsShiritoriCompliant (bef, aft) {
  var befHira = rmDakutenAndCapsSmallVowels(convertToHiragana(bef));
  var aftHira = rmDakutenAndCapsSmallVowels(convertToHiragana(aft));

  var isSmallKana = ['ゃ', 'ゅ', 'ょ'].indexOf(befHira[befHira.length - 1]) !== -1;
  var endsInNG = 'ん' === befHira[befHira.length - 1];

  if (befHira.charCodeAt(befHira.length - 1) === aftHira.charCodeAt(0) ||
    (smallKanaFallbackToPreviousKanaIsValid && isSmallKana && befHira.charCodeAt(befHira.length - 2) === aftHira.charCodeAt(0)) ||
    (nNotALosingKana && endsInNG && ['ん', 'な', 'に', 'ぬ', 'ね', 'の'].indexOf(aftHira(0)))) {
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
    ['う', 'ゔ']
  ];
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

module.exports = areWordsShiritoriCompliant;
