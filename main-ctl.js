require('dotenv').config({path: __dirname + '/.env'});

var firebase = require('firebase');
var areWordsShiritoriCompliant = require('./shiritori-compliance.js');

firebase.initializeApp({
  serviceAccount: __dirname + '/db_auth/' + process.env.DB_JSON,
  databaseURL: process.env.DB_URL
});

var db = firebase.database();
var ref = db.ref('words');
var bot;

var reJapaneseWord = /^([\u3005\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]*(?:\s+)(?![\u0020-\u3000\ua000-\uffff\uff01-\uff5e]+)|[\u3040-\u309f\u30a0-\u30ff]+(?:\s*))([\u3040-\u309f\u30a0-\u30ff]*)?\s*([\u0020-\u3000\ua000-\uffff\uff01-\uff5e\s]+)$/;
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
      if (message.channel.server) {
        ref.child(message.channel.server.id + '/' + params[1]).remove(function (error) {
          if (error) {
            bot.sendMessage(message.channel, 'Word not in database: ' + params[1]);
          } else {
            console.log(getTime() + message.author.username + ' -> Japanese word removed from db: ' + params[1]);
            bot.sendMessage(message.channel, 'Japanese word removed from db: ' + params[1]);
          }
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
        ref.child(message.channel.server.id).remove(function (error) {
          if (error) {
            bot.sendMessage(message.channel, 'Could not reset.');
          } else {
            console.log(getTime() + message.author.username + ' -> Database of words reseted.');
            bot.sendMessage(message.channel, 'Database of words reseted.');
          }
        });
      }
    }
  },
  {
    command: 'ping',
    description: 'Shows the channel where the bot will currently send stuff.',
    parameters: [],
    permissions: ['resident'],
    execute: function (message, params) {
      bot.sendMessage(message.channel, 'Pong.');
    }
  }
];

function hasPermission (server, user, command) {
  var permissions = command.permissions;

  if (permissions.length == 0) {
    return true;
  }

  if (server) {
    for (i in bot.servers) {
      var userRoles = bot.servers.get('id', server.id).rolesOfUser(user);

      for (var i = 0; i < userRoles.length; i++) {
        if (permissions.findIndex((el) => el === userRoles[i].name.toLowerCase()) !== -1) {
          return true;
        }
      }
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
    if (!hasPermission(message.channel.server, message.author, com)) {
      bot.reply(message, "Sorry, you don't have the permission to use that command.");
    } else if (params.length - 1 < com.parameters.length) {
      bot.reply(message, 'Insufficient parameters. This command accepts ' + com.parameters.length + ' parameters: ' + com.parameters.join());
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

    bot.reply(message, 'Unknown command: "' + params[0] + '"');
    bot.sendMessage(message.channel, 'List of available commands:\n' + availableCommands);
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
    console.log(getTime() + message.author.username + ' -> Japanese word detected in server: ' + message.channel.server.id + ' #' + message.channel.name);

    ref.child(message.channel.server.id + '/' + detectedWord[1]).once('value', function (snap) {
      var word = detectedWord[1];
      var reading = detectedWord[2] || detectedWord[1];
      var meaning = detectedWord[3];

      if (snap.exists() && (snap.child('reading').val() == reading || (snap.hasChild('alt_readings') && snap.child('alt_readings').val().indexOf(reading) !== -1))) {
        var lastWordFound = snap.val();
        lastWordFound.word = snap.key;
        console.log(getTime() + message.author.username + ' -> Word found on database: ' + lastWordFound.word);

        ref.child(message.channel.server.id).orderByChild('order').limitToLast(1).once('value', function (snap) {
          if (snap.exists()) {
            var key = Object.keys(snap.val())[0];
            var row = snap.val()[key];
            row.word = key;
            bot.sendMessage(message.channel, 'Word ' + lastWordFound.word + ' already used [ Readings: ' + lastWordFound.reading + (lastWordFound.alt_readings ? ', ' + lastWordFound.alt_readings.join(', ') : '') +
              ' Meaning: ' + lastWordFound.meaning + ' ].\nLast word: ' + row.word + ' [ Reading: ' + (row.alt_readings ? row.alt_readings[row.alt_readings.length - 1] : row.reading) + ' Meaning: ' + row.meaning + ' ].');
          } else {
            bot.sendMessage(message.channel, 'Word ' + lastWordFound.word + ' already used [ Reading: ' + lastWordFound.reading + (lastWordFound.alt_readings ? ', ' + lastWordFound.alt_readings.join(', ') : '') +
              ' Meaning: ' + lastWordFound.meaning + ' ].');
          }
        });
      } else {
        var isAltReading = snap.exists() && snap.child('reading').val() != reading;
        ref.child(message.channel.server.id).orderByChild('order').limitToLast(1).once('value', function (snap) {
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
              if (!words[message.channel.server.id]) {
                words[message.channel.server.id] = {};
              }
              if (!words[message.channel.server.id][word]) {
                words[message.channel.server.id][word] = {
                  order: order,
                  spelling: word,
                  reading: reading,
                  meaning: meaning,
                  server_id: message.channel.server.id
                };
              }
              if (isAltReading) {
                if (!words[message.channel.server.id][word]['alt_readings']) {
                  words[message.channel.server.id][word]['alt_readings'] = [];
                }
                words[message.channel.server.id][word]['alt_readings'].push(reading);
              }
              return words;
            }, function (error, committed, snapshot) {
              if (!error && committed) {
                console.log(getTime() + message.author.username + ' -> Japanese word added to db: ' + word + ', ' + reading + ', ' + meaning);
              }
            });
          } else {
            bot.sendMessage(message.channel, 'Word ' + word + ' not allowed. \nPrevious word: ' + previousWord.spelling + ' [ Reading: ' + previousWord.reading + (previousWord.alt_readings ? ', ' + previousWord.alt_readings.join(', ') : '') + ' Meaning: ' + previousWord.meaning + ' ].');
          }
        });
      }
    });
  } else if(reAnyJapaneseWord.test(message.content)) {
    bot.sendMessage(message.channel, 'Wrong syntax: expecting either `word-in-kanji word-in-kana translation` or `word-in-kana translation`');
  }
}

module.exports = MainCtl;
