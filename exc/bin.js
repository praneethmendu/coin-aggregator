/*
Add your API key and secret below
Add coins by adding required markets to the subs variable
*/
exports.listnr = (gloBus, runList, tick) => {
  const Binance = require('binance-api-node').default;
  const client = Binance({
    apiKey: 'YOUR_API_KEY_HERE',
    apiSecret: 'YOUR_API_SECRET_HERE'
  });

  let subs = {
    REP: ['REPBTC', 'REPETH'],
    KNC: ['KNCBTC', 'KNCETH'],
    //    BAT: ['BATBTC', 'BATETH'],
    //    OMG: ['OMGBTC', 'OMGETH'],
  };

  let tokens = runList.reduce(
    (i, ent) => (subs[ent] ? i.concat(subs[ent]) : i), []
  );




  let btcTick = {};

  function getTick() {
    client.allBookTickers().then(tickers => {
      gloBus.emit(
        'tick',
        tick
        .map(itm => itm + 'ETH')
        .concat('BTCUSDT', 'ETHUSDT')
        .map(itm => {
          return {
            sym: itm,
            price: tickers[itm].askPrice
          };
        })
      );
      btcTick.bid = tickers['ETHBTC'].bidPrice;
      btcTick.ask = tickers['ETHBTC'].askPrice;
    }).catch(e => {
      console.log(e)
    });
  }

  getTick();
  setInterval(getTick, 8000);
  gloBus.on('ready', balls => {

    let balances;
    client
      .accountInfo()
      .then(msg => {
        runList
          .filter(tok => Object.keys(subs).findIndex(sub => sub == tok) > -1)
          .concat(['ETH', 'BTC', 'USDT'])
          .concat(tick)
          .map(tok => {
            let entry = msg.balances.find(ent => ent.asset == tok);
            gloBus.emit('balance', {
              symbol: tok,
              coins: entry.free,
              exchange: 'binf'
            });
            gloBus.emit('balance', {
              symbol: tok,
              coins: entry.locked,
              exchange: 'binl'
            });
          });

        // rate finder
        let initeth = 6.13972962;
        let initusd = 2579.6482657;
        let inittime = '1523012160185';
        let usdbal = msg.balances.find(ent => ent.asset == 'USDT');
        let ethbal = msg.balances.find(ent => ent.asset == 'ETH');
        usdbal = parseFloat(usdbal.locked) + parseFloat(usdbal.free);
        ethbal = parseFloat(ethbal.locked) + parseFloat(ethbal.free);
        gloBus.emit('rate', {
          symbol: 'ETH',
          qty: ethbal - initeth,
          rate: (usdbal - initusd) / (ethbal - initeth)
        });
        /* print previous balances
          client
            .myTrades({
              symbol: 'ETHUSDT'
            })
            .then(resp => {
              resp
                .reverse()
                .slice(0, 20)
                .map(each => {
                  if (each.isBuyer == true) {
                    ethbal = ethbal - parseFloat(each.qty);
                    usdbal = usdbal + parseFloat(each.qty * each.price);
                  } else if (each.isBuyer == false) {
                    ethbal = ethbal + parseFloat(each.qty);
                    usdbal = usdbal - parseFloat(each.qty * each.price);
                  }
                  let tradetime = new Date(each.time);
                  console.log(tradetime, ethbal, usdbal, each.price);
                });
              console.log('*****************************************');
              });
              */
      })
      .catch(err => {
        console.log(err);
      });
  });


  tokens.map(sym => {
    client.ws.partialDepth({
      symbol: sym,
      level: 10
    }, depth => {
      let asks = depth.asks.map(a => {
        return {
          price: sym.slice(sym.length - 3, sym.length) == 'BTC' ? parseFloat(a.price) / parseFloat(btcTick.ask) : a.price,
          tokens: a.quantity,
          exchange: 'bin' + sym.slice(sym.length - 3, sym.length),
          own: 0
        }
      })
      let bids = depth.bids.map(a => {
        return {
          price: sym.slice(sym.length - 3, sym.length) == 'BTC' ? parseFloat(a.price) / parseFloat(btcTick.bid) : a.price,
          tokens: a.quantity,
          exchange: 'bin' + sym.slice(sym.length - 3, sym.length),
          own: 0
        }
      })

      client.openOrders({
        symbol: sym,
      }).then(open => {
        open.map(yo => {
          try {
            if (yo.side == 'BUY') {
              bids.find(a => a.price == yo.price).own = (yo.origQty - yo.executedQty)
            } else {
              asks.find(a => a.price == yo.price).own = (yo.origQty - yo.executedQty)
            }
          } catch (e) {
            //            console.log(sym + 'bin order out of range');
          }
        })
      }).catch(e => {
        console.log(e)
      })

      gloBus.emit('order', {
        asks: asks,
        bids: bids,
        name: sym.slice(0, 3)
      })
    })
  })


  /*
  saveVal(
    openOrders.map(e => {
      return {
        qty: e.origQty - e.executedQty,
        price: e.price,
        side: e.side
      };
    }),
    symbol
  );


  */



  client.ws.user(msg => {
    if (msg.eventType == 'executionReport') {
      if (msg.executionType == 'TRADE') {
        gloBus.emit('trade', {
          price: msg.price,
          tokens: msg.lastTradeQuantity,
          exchange: msg.symbol + 'bin',
          uxtime: Date.now()
        });
      }
    } else if (msg.eventType == 'account') {
      runList
        .filter(tok => Object.keys(subs).findIndex(sub => sub == tok) > -1)
        .concat(['ETH', 'BTC'])
        .map(tok => {
          let entry = msg.balances[tok];
          gloBus.emit('balance', {
            symbol: tok,
            coins: entry.available,
            exchange: 'binf'
          });
          gloBus.emit('balance', {
            symbol: tok,
            coins: entry.locked,
            exchange: 'binl'
          });
        });
    }
  });
};
