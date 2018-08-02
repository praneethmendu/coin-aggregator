exports.go = function(globus, data) {
  let potent = JSON.parse(JSON.stringify(data));
  let arb = [];
  while (parseFloat(potent.bids[0].price) > parseFloat(potent.asks[0].price)) {
    let tokens =
      parseFloat(potent.bids[0].tokens) < parseFloat(potent.asks[0].tokens)
        ? parseFloat(potent.bids[0].tokens)
        : parseFloat(potent.asks[0].tokens);
    arb.push({
      buy: potent.asks[0].exchange,
      sell: potent.bids[0].exchange,
      profit:
        tokens *
        (parseFloat(potent.bids[0].price) - parseFloat(potent.asks[0].price)),
      tokens: tokens,
      name: potent.name
    });
    if (tokens == parseFloat(potent.bids[0].tokens)) {
      potent.bids = potent.bids.slice(1, potent.bids.length);
      potent.asks[0].tokens = parseFloat(potent.asks[0].tokens) - tokens;
    } else if (tokens == parseFloat(potent.asks[0].tokens)) {
      potent.asks = potent.asks.slice(1, potent.asks.length);
      potent.bids[0].tokens = parseFloat(potent.bids[0].tokens) - tokens;
    }
  }
  if (arb.length > 0) globus.emit('arb', arb);
};

/*


exports.main = function(data) {

    var potent = JSON.parse(JSON.stringify(data));
    var spread, qty;
    var totalT = 0,
        totalP = 0;
    i = 0;

    while ((spread = potent.bids[0].rate - potent.asks[potent.asks.length - 1].rate) > 0) {

        if ((remain = potent.asks[potent.asks.length - 1].tokens - potent.bids[0].tokens) > 0) {
            totalT += potent.bids[0].tokenspotent.bids.slice(1, potent.bids.length)
            totalP += potent.bids[0].tokens * spread
            potent.asks[potent.asks.length - 1].tokens = remain
            potent.bids =
        } else {
            totalT += potent.asks[potent.asks.length - 1].tokens
            totalP += potent.asks[potent.asks.length - 1].tokens * spread
            potent.bids[0].tokens = remain * -1
            potent.asks = potent.asks.slice(0, -1)
        }
        i++;
    }
    //event
    if (i == 0) { return 0 } else {
        return { 'tokens': totalT, 'profit': totalP }
    }
}*/
