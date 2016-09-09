require('dotenv').config({path: __dirname + '/.env'});

var firebase = require('firebase');
var areWordsShiritoriCompliant = require(__dirname + '/shiritori-compliance.js').areWordsShiritoriCompliant;
var convertToHiragana = require(__dirname + '/shiritori-compliance.js').convertToHiragana;

firebase.initializeApp({
  serviceAccount: __dirname + '/db_auth/' + process.env.DB_JSON,
  databaseURL: process.env.DB_URL
});

var db = firebase.database();
var ref = db.ref('words');
var bot;

var reJapaneseWord = /^([\u3005\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]*[\u3005\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]+[\u3005\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]*)?(?:\s+)?([\u3040-\u309f\u30a0-\u30ff]+)(?:\s+)([\u0020-\u3000\ua000-\uffff\uff01-\uff5e\s]+)$/;
var reAnyJapaneseWord = /^([\u3005\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf])/;

function MainCtl (appBot) {
  bot = appBot;
}

MainCtl.prototype.handleCommand = handleCommand;
MainCtl.prototype.handleJapaneseWord = handleJapaneseWord;
MainCtl.prototype.getTime = getTime;
MainCtl.prototype.firebase = firebase;

var commands = [
  {
    command: 'remove',
    description: 'Removes a japanese word.',
    parameters: ['word'],
    permissions: ['serverop', 'resident'],
    execute: function (message, params) {
      if (message.guild) {
        ref.child(message.guild.id + '/' + params[1]).remove()
          .then(function () {
            console.log(getTime() + message.author.username + ' -> Japanese word removed from db: ' + params[1]);
            message.channel.sendMessage('Japanese word removed from db: ' + params[1]);
          })
          .catch(function (error) {
            message.channel.sendMessage('Word not in database: ' + params[1]);
          });
      }
    }
  },
  {
    command: 'reset',
    description: 'Resets the db of words.',
    parameters: ['force'],
    permissions: ['serverop'],
    execute: function (message, params) {
      if (params[1] == 'force') {
        ref.child(message.guild.id).remove()
          .then(function (error) {
            console.log(getTime() + message.author.username + ' -> Database of words reseted.');
            message.channel.sendMessage('Database of words reseted.');
          })
          .catch(function (error) {
            message.channel.sendMessage('Could not reset.');
          });
      }
    }
  },
  {
    command: 'stats',
    description: 'Shows the stats related to the game.',
    parameters: [],
    permissions: ['resident'],
    execute: function (message, params) {
      ref.child(message.guild.id).once('value')
        .then(function (snap) {
          message.channel.sendMessage('Total words in database: ' + snap.numChildren());

          ref.child(message.guild.id).orderByChild('order').limitToLast(1).once('value')
            .then(function (snap) {
              if (snap.exists()) {
                var key = Object.keys(snap.val())[0];
                var row = snap.val()[key];
                row.word = key;
                message.channel.sendMessage('Last word processed: ' + row.word + ' [ Reading: ' + (row.alt_readings ? row.alt_readings[row.alt_readings.length - 1] : row.reading) + ' Meaning: ' + row.meaning + ' ].');
              }
            });
        });
    }
  },
  {
    command: 'ping',
    description: 'Shows the channel where the bot will currently send stuff.',
    parameters: [],
    permissions: ['resident'],
    execute: function (message, params) {
      message.channel.sendMessage('Pong.');
    }
  }
];

function hasPermission (server, user, command) {
  var permissions = command.permissions;

  if (permissions.length == 0) {
    return true;
  }

  if (server) {
    if (permissions.findIndex((el) => server.members.find('id', user.id).roles.exists('name', el.toLowerCase())) !== -1) {
      return true;
    }
  }

  return false;
}

function searchCommand (command) {
  for (var i = 0; i < commands.length; i++) {
    if (commands[i].command == command.toLowerCase()) {
      return commands[i];
    }
  }

  return false;
}

function handleCommand (message, command) {
  console.log(getTime() + message.author.username + ' -> ' + command);
  var params = command.split(' ');
  var com = searchCommand(params[0]);

  if (com) {
    if (!hasPermission(message.guild, message.author, com)) {
      message.reply("Sorry, you don't have the permission to use that command.");
    } else if (params.length - 1 < com.parameters.length) {
      message.reply('Insufficient parameters. This command accepts ' + com.parameters.length + ' parameters: ' + com.parameters.join());
    } else {
      com.execute(message, params);
    }
  } else {
    var availableCommands = '';
    for (i in commands) {
      availableCommands += '.' + commands[i].command + ' ';
      for (j in commands[i].parameters) {
        availableCommands += commands[i].parameters[j] + ' ';
      }
      availableCommands += ' => ' + commands[i].description + ' Available to: ' + commands[i].permissions.join() + '\n';
    }

    message.reply('Unknown command: "' + params[0] + '"');
    message.channel.sendMessage('List of available commands:\n' + availableCommands);
  }
}

function getTime () {
  function f (x) {
    return x < 10 ? '0' + x : x;
  }
  var date = new Date();
  return '[' + f(date.getHours()) + ':' + f(date.getMinutes()) + ':' + f(date.getSeconds()) + '] ';
}

function handleJapaneseWord (message) {
  // detect any japanese word at the beginning of a sentence
  var detectedWord = message.content.match(reJapaneseWord);
  if (detectedWord) {
    console.log(getTime() + message.author.username + ' -> Japanese word detected in server: ' + message.guild.id + ' #' + message.channel.name);

    ref.child(message.guild.id + '/' + detectedWord[1]).once('value')
      .then(function (snap) {
        var word = detectedWord[1] || detectedWord[2];
        var reading = convertToHiragana(detectedWord[2]);
        var meaning = detectedWord[3];

        var foundDuplicate = false;

        if (convertToHiragana(word) === reading) {
          ref.child(message.guild.id + '/' + convertToHiragana(word)).once('value')
            .then(function (snap) {
              if (snap.exists() && (snap.child('reading').val() == reading || (snap.hasChild('alt_readings') && snap.child('alt_readings').val().indexOf(reading) !== -1))) {
                foundDuplicate = true;
                var lastWordFound = snap.val();
                lastWordFound.word = snap.key;
                console.log(getTime() + message.author.username + ' -> Word found on database: ' + lastWordFound.word);

                ref.child(message.guild.id).orderByChild('order').limitToLast(1).once('value')
                  .then(function (snap) {
                    if (snap.exists()) {
                      var key = Object.keys(snap.val())[0];
                      var row = snap.val()[key];
                      row.word = key;
                      message.channel.sendMessage('Word ' + lastWordFound.word + ' already used [ Readings: ' + lastWordFound.reading + (lastWordFound.alt_readings ? ', ' + lastWordFound.alt_readings.join(', ') : '') +
                        ' Meaning: ' + lastWordFound.meaning + ' ].\nLast word: ' + row.word + ' [ Reading: ' + (row.alt_readings ? row.alt_readings[row.alt_readings.length - 1] : row.reading) + ' Meaning: ' + row.meaning + ' ].');
                    } else {
                      message.channel.sendMessage('Word ' + lastWordFound.word + ' already used [ Reading: ' + lastWordFound.reading + (lastWordFound.alt_readings ? ', ' + lastWordFound.alt_readings.join(', ') : '') +
                        ' Meaning: ' + lastWordFound.meaning + ' ].');
                    }
                  });
              }
            });
        }

        if (!foundDuplicate && snap.exists() && (snap.child('reading').val() == reading || (snap.hasChild('alt_readings') && snap.child('alt_readings').val().indexOf(reading) !== -1))) {
          var lastWordFound = snap.val();
          lastWordFound.word = snap.key;
          console.log(getTime() + message.author.username + ' -> Word found on database: ' + lastWordFound.word);

          ref.child(message.guild.id).orderByChild('order').limitToLast(1).once('value')
            .then(function (snap) {
              if (snap.exists()) {
                var key = Object.keys(snap.val())[0];
                var row = snap.val()[key];
                row.word = key;
                message.channel.sendMessage('Word ' + lastWordFound.word + ' already used [ Readings: ' + lastWordFound.reading + (lastWordFound.alt_readings ? ', ' + lastWordFound.alt_readings.join(', ') : '') +
                  ' Meaning: ' + lastWordFound.meaning + ' ].\nLast word: ' + row.word + ' [ Reading: ' + (row.alt_readings ? row.alt_readings[row.alt_readings.length - 1] : row.reading) + ' Meaning: ' + row.meaning + ' ].');
              } else {
                message.channel.sendMessage('Word ' + lastWordFound.word + ' already used [ Reading: ' + lastWordFound.reading + (lastWordFound.alt_readings ? ', ' + lastWordFound.alt_readings.join(', ') : '') +
                  ' Meaning: ' + lastWordFound.meaning + ' ].');
              }
            });
        } else {
          var isAltReading = snap.exists() && snap.child('reading').val() != reading;
          ref.child(message.guild.id).orderByChild('order').limitToLast(1).once('value')
            .then(function (snap) {
              var order = 1;
              if (snap.exists()) {
                var key = Object.keys(snap.val())[0];
                var previousWord = snap.val()[key];
                order = previousWord.order + 1;
                var previousWordLastAlt = snap.hasChild(word + '/alt_readings') ? snap.child(word + '/alt_readings').val()[snap.child(word + '/alt_readings').numChildren() - 1] : null;
              }
              if (!snap.exists() || areWordsShiritoriCompliant(previousWord.reading, reading) || (previousWordLastAlt && areWordsShiritoriCompliant(previousWordLastAlt, reading))) {
                ref.transaction(function (words) {
                  if (!words) {
                    var words = {};
                  }
                  if (!words[message.guild.id]) {
                    words[message.guild.id] = {};
                  }
                  if (!words[message.guild.id][word]) {
                    words[message.guild.id][word] = {
                      order: order,
                      spelling: word,
                      reading: reading,
                      meaning: meaning,
                      server_id: message.guild.id
                    };
                  }
                  if (isAltReading) {
                    if (!words[message.guild.id][word]['alt_readings']) {
                      words[message.guild.id][word]['alt_readings'] = [];
                    }
                    words[message.guild.id][word]['alt_readings'].push(reading);
                  }
                  return words;
                }, function (error, committed, snapshot) {
                  if (!error && committed) {
                    console.log(getTime() + message.author.username + ' -> Japanese word added to db: ' + word + ', ' + reading + ', ' + meaning);
                  }
                });
              } else if (!foundDuplicate) {
                message.channel.sendMessage('Word ' + word + ' not allowed. \nPrevious word: ' + previousWord.spelling + ' [ Reading: ' + previousWord.reading + (previousWord.alt_readings ? ', ' + previousWord.alt_readings.join(', ') : '') + ' Meaning: ' + previousWord.meaning + ' ].');
              }
            });
        }
      });
  } else if (reAnyJapaneseWord.test(message.content)) {
    message.channel.sendMessage('Wrong syntax: expecting either `word-in-kanji word-in-kana translation` or `word-in-kana translation`');
  }
}

module.exports = MainCtl;
