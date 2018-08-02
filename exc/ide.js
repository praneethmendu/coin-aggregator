/*
Add your ethereum address to the user variable
Martets to track can be added to the subs variable,
*/
exports.listnr = (gloBus, runList) => {
  const user = 'YOUR_ETH_ADDRESS_HERE';
  const subs = {
    BAT: ['ETH_BAT'],
    KNC: ['ETH_KNC'],
  };

  const request = require('request');
  const tokens = runList.reduce(
    (i, ent) => (subs[ent] ? i.concat(subs[ent]) : i), []
  );

  let ide = {};
  ide.getopen = market => {
    request({
        method: 'POST',
        url: 'https://api.idex.market/returnOpenOrders',
        json: {
          address: user,
          market: market
        }
      },
      function(err, resp, body) {
        if (err != null) {
          console.log('wierd err', err);
        } else {
          ide.open[market] = body;
        }
      }
    );
  };

  ide.bal = () => {
    request({
        method: 'POST',
        url: 'https://api.idex.market/returnCompleteBalances',
        json: {
          address: user
        }
      },
      function(err, resp, body) {
        if (err != null) {
          console.log('wierd err', err);
        } else {
          Object.keys(body).map(tok => {
            gloBus.emit('balance', {
              symbol: tok,
              coins: body[tok].available,
              exchange: 'idef'
            });
            gloBus.emit('balance', {
              symbol: tok,
              coins: body[tok].available,
              exchange: 'idef'
            });
          });
        }
      }
    );
  };

  ide.book = market => {
    request({
        method: 'POST',
        url: 'https://api.idex.market/returnOrderBook',
        json: {
          market: market
        }
      },
      function(err, resp, body) {
        if (err != null) {
          console.log('wierd err', err);
        } else {
          let book = {};
          if (body.asks) {
            book.name = market.slice(-3, market.length);
            book.asks = body.asks.map(ask => {
              return {
                price: ask.price,
                tokens: ask.amount,
                exchange: 'ide',
                own: ask.params.user.toUpperCase() == user.toUpperCase() ?
                  ask.amount : 0
              };
            });
            book.bids = body.bids.map(bid => {
              return {
                price: bid.price,
                tokens: bid.amount,
                exchange: 'ide',
                own: bid.params.user.toUpperCase() == user.toUpperCase() ?
                  bid.amount : 0
              };
            });
            gloBus.emit('order', book);
          }
        }
      }
    );
  };

  let i = 0;
  setInterval(() => {
    if (i < tokens.length) {
      ide.book(tokens[i]);
      i++;
    } else if (i == tokens.length) {
      ide.bal();
      i = 0;
    }
  }, 3000);
};
