var Discord = require('discord.js');
var MainCtl = require('./main-ctl.js');

var bot = new Discord.Client();
var _token = 'insert-discord-bot-token-here';
var mainCtl = new MainCtl(bot);

bot.on('ready', function () {
  console.log('Ready!');
  console.log('Servers joined: ' + bot.servers.map(function (server) {
      return server.name + ',' + server.id + ';';
    }));
});

bot.on('message', function (message) {
  if (message.channel.name == 'shiritori') {
    if (message.content[0] == '.') {
      mainCtl.handleCommand(message, message.content.substring(1));
    }

    mainCtl.handleJapaneseWord(message);
  }
});

bot.loginWithToken(_token);
