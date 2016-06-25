# shiritori-kun
### A bot for Discord to manage a channel where people play the Shiritori game.

**Configuration**:

You need to add your discord app token and set up the connection to your own firebase in [.env#1](https://github.com/Harumaro/shiritori-kun-discord-bot/blob/master/.env_example#L5)
```
BOT_TOKEN=insert-discord-bot-token-here
DB_URL=https://dbname.firebaseio.com/
DB_JSON=firebase-auth.json
var _token = '';
```
You need to place your json credentials in the db_auth folder of the project.

**Usage**:
- **word-in-kanji[i.e.: 漢字]** **word-in-kana[i.e.: かんじ]** *translation[i.e.: chinese character]*: inserts a new word in the database, accepts both half-width and full-width space between characters.
- (alt. version) **word-in-kana[i.e.: サマー]** *translation[i.e.: summer]*
- .remove **word-in-kanji**: removes a word from the database
- .reset: cleans the whole database of words

**Customization**:

First lines in [shiritori-compliance.js](https://github.com/Harumaro/shiritori-kun-discord-bot/blob/master/shiritori-compliance.js) define the rules accepted in your game.

So far you can choose to:
- when words end in the long vowel sign, allow also words starting with the previous syllable by setting the _longVowelFallbackToPreviousKanaIsValid_ flag to true; alternatively disallow this behaviour by setting it to false, in this case only words starting by vowels will be allowed.
- when words end in N, allow the game to continue with a custom rule falling back on the な行 by setting the _allowNKana_ flag to true. This might be useful if you plan to use your game for learning purposes.
- when words end in a 拗音 (contracted sound), allow the next word whether it starts with the entire contracted sound or with や,ゆ or よ by setting the _smallKanaFallbackToPreviousKanaIsValid_ flag to true; alternatively set it to false to only accept や,ゆ or よ as the next word starting syllable.

**Future developments**:

Match words on dictionary.
