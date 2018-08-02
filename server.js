/*
Add required coins to the ledg vatiable
ticker coins should be added to thr tick variable
*/

let ledg = {
  REP: {},
  KNC: {},
};

let tick = ['XMR', 'DASH', 'XRP']

const express = require('express');
const server = express();
const servermod = require('http').createServer(server);

// socket.io
const io = require('socket.io')(servermod);
io.on('connection', client => {
  client.emit('list', [Object.keys(ledg), tick]);
  gloBus.emit('ready', 'balls')
});
// telebot
// const TeleBot = require('telebot');
// const bot = new TeleBot('455360254:YOUR_API_KEY');

// serve
server.use(express.static(__dirname + '/node_modules'));
server.use('/public', express.static('public'));
server.get('/', (req, res) => {
  res.sendFile('index.html', {
    root: __dirname
  });
});

servermod.listen(5555, function() {
  console.log('arbMan listening on port 5555');
});

// globus
const EventEmitter = require('events');
const gloBus = new EventEmitter();

gloBus.on('order', obj => {
  ledg[obj.name][obj.asks[0].exchange] = obj;

  globook = Object.keys(ledg[obj.name]).reduce(
    (i, elm) => {
      return {
        asks: i.asks.concat(ledg[obj.name][elm].asks),
        bids: i.bids.concat(ledg[obj.name][elm].bids)
      };
    }, {
      asks: [],
      bids: []
    }
  );
  const fbook = {
    asks: globook.asks.sort((a, b) => a.price - b.price),
    bids: globook.bids.sort((a, b) => b.price - a.price),
    name: obj.name
  };
  io.emit('order', fbook);
  require('./arbMain.js').go(gloBus, fbook);
});

gloBus.on('trade', obj => {
  io.emit('trade', obj);
  // bot.sendMessage(442494900, 'trade \n' + JSON.stringify(obj));
});

gloBus.on('balance', obj => {
  io.emit('balance', obj);
});

gloBus.on('rate', obj => {
  io.emit('rate', obj);
});

gloBus.on('arb', obj => {
  io.emit('arb', obj);
  let flat = obj.reduce(
    (flat, elm) => {
      flat.profit += parseFloat(elm.profit);
      flat.tokens += parseFloat(elm.tokens);
      flat.buy.push(elm.buy);
      flat.sell.push(elm.sell);
      return flat;
    }, {
      profit: 0,
      tokens: 0,
      buy: [],
      sell: [],
    }
  );
  //  bot.sendMessage(442494900, obj[0].name + '\n' + JSON.stringify(flat));
});
gloBus.on('play', name => {
  io.emit('play', name);
});
// main app pages
gloBus.on('tick', name => {
  io.emit('tick', name);
});
require('./exc/ede.js').listnr(gloBus, Object.keys(ledg));
require('./exc/bin.js').listnr(gloBus, Object.keys(ledg), tick);
require('./exc/liv.js').listnr(gloBus, Object.keys(ledg));
require('./exc/ide.js').listnr(gloBus, Object.keys(ledg));
