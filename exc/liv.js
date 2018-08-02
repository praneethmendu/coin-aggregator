/*
Add the API key and secret
the markets to track in the subs variable
ballist to track balance
*/

exports.listnr = (gloBus, runList) => {
  const pubkey = 'YOUR_API_KEY_HERE';
  const secret = 'YOUR_API_SECRET_HERE';
  const subs = {
    DIG: ['DIG/BTC', 'DIG/ETH'],
    ICN: ['ICN/BTC']
  };
  const balList = ['ETH', 'DIG', 'BTC'];

  const axios = require('axios');
  const crypto = require('crypto');
  const tokens = runList.reduce(
    (i, ent) => (subs[ent] ? i.concat(subs[ent]) : i), []
  );

  let liv = {};
  liv.rate = {
    btc: {}
  };
  liv.open = [];
  let balArr = balList.map(each1 => [each1, 0, 0]);

  liv.getopen = () => {
    axios('/exchange/client_orders', {
        params: {
          openClosed: 'OPEN'
        },
        baseURL: 'https://api.livecoin.net/',
        headers: {
          'Api-key': pubkey,
          Sign: crypto
            .createHmac('sha256', secret)
            .update('openClosed=OPEN')
            .digest('hex')
            .toUpperCase()
        }
      })
      .then(function(response) {
        if (response.data.data != null) {
          liv.open = response.data.data;
          balArr = balArr.map(each3 => [each3[0], 0, each3[2]]);
        }

        // locked balance
        liv.open.map(each1 => {
          if (each1.type[6] == 'B') {
            balArr[
                balList.findIndex(each2 => each2 == each1.currencyPair.slice(4))
              ][1] +=
              each1.price * each1.remainingQuantity;
          } else if (each1.type[6] == 'S') {
            balArr[
                balList.findIndex(
                  each2 => each2 == each1.currencyPair.slice(0, 3)
                )
              ][1] +=
              each1.remainingQuantity;
          }
        });
        balArr.map(each1 => {
          gloBus.emit('balance', {
            symbol: each1[0],
            coins: each1[1],
            exchange: 'xxxl'
          });
        });
        // console.log(balArr);
      })
      .catch(function(error) {
        console.log('liv : cli orders get failed', error);
      });
  };

  liv.bal = sym => {
    axios('/payment/balance', {
        params: {
          currency: sym
        },
        baseURL: 'https://api.livecoin.net/',
        headers: {
          'Api-key': pubkey,
          Sign: crypto
            .createHmac('sha256', secret)
            .update('currency=' + sym)
            .digest('hex')
            .toUpperCase()
        }
      })
      .then(function(response) {
        balArr[balList.findIndex(each2 => each2 == response.data.currency)][2] =
          response.data.value;

        gloBus.emit('balance', {
          symbol: response.data.currency,
          coins: response.data.value,
          exchange: 'xxxf'
        });

      })
      .catch(function(error) {
        console.log('liv : bal failed');
      });
  };

  liv.tradewatch = () => {

    const hash = crypto.createHmac('sha256', secret).update('');
    axios('/exchange/trades', {
        // params: params,
        baseURL: 'https://api.livecoin.net/',
        headers: {
          'Api-key': pubkey,
          Sign: hash.digest('hex').toUpperCase()
        }
      })
      .then(function(response) {
        let change = response.data.findIndex(elm => elm.id == liv.latestTrade);

        response.data.slice(0, change).map(elm => {
          gloBus.emit('trade', {
            price: elm.price,
            tokens: elm.quantity,
            exchange: elm.symbol + 'xxx',
            uxtime: elm.datetime
          });
        });

        liv.latestTrade = response.data[0].id;
      })
      .catch(function(error) {
        console.log('liv : error watch failed');
      });
  };

  (liv.getrate = cur => {
    axios
      .get(
        'https://api.livecoin.net/exchange/maxbid_minask?currencyPair=ETH/' +
        cur.toUpperCase()
      )
      .then(function(response) {
        liv.rate[cur].bid = parseFloat(response.data.currencyPairs[0].maxBid);
        liv.rate[cur].ask = parseFloat(response.data.currencyPairs[0].minAsk);
      })
      .catch(function(error) {
        console.log(error);
      });
  }),
  (liv.book = tok => {
    axios
      .get('https://api.livecoin.net/exchange/order_book?currencyPair=' + tok)
      .then(function(response) {
        let book = {};
        book.name = tok.slice(0, 3);
        book.bids = response.data.bids.map(bid => {
          return {
            price: bid[0],
            tokens: bid[1],
            exchange: 'xxx' + tok.slice(4, 7),
            own: 0
          };
        });
        book.asks = response.data.asks.map(ask => {
          return {
            price: ask[0],
            tokens: ask[1],
            exchange: 'xxx' + tok.slice(4, 7),
            own: 0
          };
        });

        liv.open.filter(elm => elm.currencyPair == tok).map(elm => {
          if (elm.type == 'LIMIT_BUY') {
            book.bids.find(i => i.price == elm.price).own =
              elm.remainingQuantity;
          } else if (elm.type == 'LIMIT_SELL') {
            book.asks.find(i => i.price == elm.price).own =
              elm.remainingQuantity;
          }
        });

        if (tok.slice(4, 7) == 'BTC') {
          book.asks.map(elm => {
            elm.price = (
              parseFloat(elm.price) *
              1.002 /
              liv.rate.btc.bid
            ).toPrecision(6);
          });
          book.bids.map(elm => {
            elm.price = (
              parseFloat(elm.price) *
              0.998 /
              liv.rate.btc.ask
            ).toPrecision(6);
          });
        }

        gloBus.emit('order', book);
      })
      .catch(function(err) {
        console.log('liv : get book failed');
      });
  });

  liv.getrate('btc');
  liv.getopen();
  // get initial trade

  axios('/exchange/trades', {
      // params: params,
      baseURL: 'https://api.livecoin.net/',
      headers: {
        'Api-key': pubkey,
        Sign: crypto
          .createHmac('sha256', secret)
          .update('')
          .digest('hex')
          .toUpperCase()
      }
    })
    .then(function(response) {
      liv.latestTrade = response.data[0].id;
    })
    .catch(function(error) {
      console.log('liv : get book failed');
    });

  let i = 0;
  setInterval(() => {
    if (i < tokens.length) {
      liv.book(tokens[i]);
      i++;
    } else if (i == tokens.length) {
      liv.getrate('btc');
      i++;
    } else if (i < tokens.length + 1 + balList.length) {
      liv.bal(balList[i - tokens.length - 2]);
      i++;
    } else if (i == tokens.length + 1 + balList.length) {
      liv.tradewatch();
      i++;
    } else if (i == tokens.length + 2 + balList.length) {
      liv.getopen();
      i = 0;
    }
  }, 3000);
};
