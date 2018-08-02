$(document).ready(function() {
  let socket = io.connect('http://localhost:5555');
  let maxbook = 10;
  let mainScope = {};
  let showitem = 0;

  let conv;

  // loco.play();
  $('#test').html('test');
  // eth converter
  $('#convert').attr('placeholder', 'enter btc');
  $('#ineth').html('equ eth');
  $('#convert').bind('input', function() {
    $('#ineth').html(+$(this).val() / +conv);
  });


  let ethprice = 0;

  function keepupdating() {
    socket.on('tick', tick => {
      $('#watchlist').html('');
      tick.map(itm => {
        if (itm.sym[itm.sym.length - 3] == 'E') {
          $('#watchlist').append(
            itm.sym.slice(0, itm.sym.length - 3) +
            '   ' +
            parseFloat(itm.price).toFixed(5) +
            'E  ' +
            parseFloat(itm.price * ethprice).toFixed(2) +
            '$  <br>'
          );
        } else if (itm.sym == 'BTCUSDT') {
          $('#btc').html(parseFloat(itm.price).toFixed(0));
        } else if (itm.sym == 'ETHUSDT') {
          ethprice = itm.price;
          $('#eth').html(parseFloat(itm.price).toFixed(0));
        }
      });
    });
    /*
    $.getJSON('https://api.coinmarketcap.com/v1/ticker/ethereum/', function(
      data
    ) {
      $('#eth').html(parseFloat(data[0].price_usd).toFixed(0));
      $('#btc').html(
        parseFloat(data[0].price_usd / (conv = data[0].price_btc)).toFixed(0)
      );
      conv = data[0].price_btc;
    });
    // watchlist
    listcr.forEach(function(element) {
      $('#watchlist').html('');
      $.getJSON(
        'https://api.coinmarketcap.com/v1/ticker/' + element + '/?convert=ETH',
        function(data) {
          $('#watchlist').append(
            '<a href="https://coinmarketcap.com/currencies/' +
              element +
              '/">' +
              element +
              '</a>  ' +
              data[0].price_usd +
              '$  ' +
              data[0].price_btc +
              'B  ' +
              data[0].price_eth +
              'E<br><br>'
          );
        }
      );
    });)*/
  }

  keepupdating();
  setInterval(keepupdating, 15000);

  const exlist = ['binf', 'binl', 'edef', 'edel', 'xxxf', 'xxxl'];
  let balList;

  responsiveVoice.speak('Disclaimer: You assume all responsibility and liability for using this software', 'Hindi Female');
  socket.on('play', tex => {
    let temp = new Audio('public/' + tex);
    temp.play();
  });
  socket.on('list', li => {
    mainScope.list = li[0];

    balList = ['ETH'].concat(li[0], li[1], ['BTC', 'USDT']);
    // balance table init
    let rowone = $('<tr />');
    rowone.append($('<th />').html('*'));
    rowone.append($('<th />').html('total'));
    exlist.map(ex => {
      rowone.append($('<th />').html(ex));
    });
    $('#bal').append(rowone);

    for (let i = 0; i < balList.length; i++) {
      let balrow = $('<tr />');
      balrow.append($('<th />').html(balList[i]));
      balrow.append($('<th />').attr('id', 'total' + i));
      exlist.map(ex => {
        balrow.append(
          $('<th />')
          .attr({
            id: 'bal' + ex + i,
            type: 'number'
          })
          .html('0')
          .css('color', 'blue')
        );
      });
      $('#bal').append(balrow);
    }

    // first lines
    alert_intro = ['low', 'current', 'high', 'received-from']
    let alertintro = $('<tr />');
    alert_intro.map(d => {
      alertintro.append($('<th />').html(d))
    })
    $('#lambo').append(alertintro);

    arb_intro = ['treashold', 'coin', 'opportunity', 'quantity', 'bid', 'ask']
    let arbintro = $('<tr />');
    arb_intro.map(d => {
      arbintro.append($('<th />').html(d))
    })
    $('#arb').append(arbintro);

    // init tables
    Object.keys(li[0]).map(i => {

      let arbrow = $('<tr />');
      arbrow.append(
        $('<input />').attr({
          id: 'codb' + i,
          type: 'number',
          value: '0.05'
        })
      );
      arbrow.append($('<th />').attr('id', 'fresh' + i));
      arbrow.append($('<th />').attr('id', 'arbprofit' + i));
      arbrow.append($('<th />').attr('id', 'arbtokens' + i));
      arbrow.append($('<th />').attr('id', 'arbfrom' + i));
      arbrow.append($('<th />').attr('id', 'arbto' + i));
      $('#arb').append(arbrow);

      let lamrow = $('<tr />');
      lamrow.append(
        $('<button />')
        .click(() => {
          showitem = i;
        })
        .html(li[0][i])
      );
      lamrow.append(
        $('<input />').attr({
          id: 'low' + i,
          type: 'number'
        })
      );
      lamrow.append($('<th />').attr('id', 'pri' + i));
      lamrow.append(
        $('<input />').attr({
          id: 'high' + i,
          type: 'number'
        })
      );
      lamrow.append($('<th />').attr('id', 'exc' + i));
      $('#lambo').append(lamrow);
    });
  });

  socket.on('arb', arb => {
    let flat = arb.reduce(
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
        sell: []
      }
    );
    const onlyUnique = (value, index, self) => {
      return self.indexOf(value) === index;
    };
    let pip = mainScope.list.indexOf(arb[0].name);

    $('#fresh' + pip)
      .html(arb[0].name)
      .css('color', 'white');
    $('#arbprofit' + pip).html(flat.profit.toPrecision(4));
    $('#arbtokens' + pip).html(flat.tokens);
    $('#arbfrom' + pip).html(flat.buy.filter(onlyUnique));
    $('#arbto' + pip).html(flat.sell.filter(onlyUnique));
    setTimeout(
      pip => {
        $('#fresh' + pip).css('color', 'blue');
      },
      4000,
      pip
    );

    if (flat.profit > $('#codb' + pip).val()) {
      responsiveVoice.speak(
        arb[0].name + flat.profit.toPrecision(4),
        'US English Female'
      );
    }
  });

  let playtr = new Audio('public/man-laughing.mp3');
  socket.on('trade', elm => {
    let row = $('<tr />');
    row.append($('<th />').html(elm.tokens));
    row.append($('<th />').html(elm.exchange));
    row.append($('<th />').html(elm.price));
    row.append($('<th />').html(elm.uxtime));
    $('#trades').append(row);
    playtr.play();
  });

  socket.on('rate', elm => {
    $('#rate' + elm.symbol).html(
      elm.symbol +
      '  ' +
      parseFloat(elm.qty).toPrecision(4) +
      '  rate ' +
      parseFloat(elm.rate).toPrecision(4)
    );
  });

  socket.on('balance', elm => {
    console.log(elm);
    let pip = balList.indexOf(elm.symbol);
    $('#bal' + elm.exchange + pip)
      .html(parseFloat(elm.coins).toPrecision(4))
      .css('color', 'white');
    // total
    let sum = exlist.reduce(
      (sum, ex) => sum + parseFloat($('#bal' + ex + pip).html()),
      0
    );
    console.log(elm.symbol, sum, $('#bal' + 'binf' + pip).html());
    $('#total' + pip).html(sum.toPrecision(4));
  });

  socket.on('order', function(data) {
    //      console.log(data);
    let entryno = mainScope.list.indexOf(data.name);
    $('#pri' + entryno).html(
      (
        parseFloat(data.bids[0].price) + parseFloat(data.asks[0].price)
      ).toPrecision(5) / 2
    );
    if (
      $('#low' + entryno).val() != '' &&
      $('#low' + entryno).val() > data.bids[0].price
    ) {
      responsiveVoice.speak(data.name + ' is low');
    }

    if (
      $('#high' + entryno).val() != '' &&
      $('#high' + entryno).val() < data.asks[0].price
    ) {
      responsiveVoice.speak(data.name + ' is high');
    }

    if (mainScope.list.indexOf(data.name) == showitem) {
      $('#asks').html(
        data.asks
        .slice(0, 16)
        .reverse()
        .reduce((table, ord) => {
          let row = $('<tr />');
          row.append($('<th />').html(parseFloat(ord.price).toPrecision(5)));
          row.append($('<th />').html(Math.floor(ord.tokens)));
          row.append($('<th />').html(ord.exchange));
          row.append(
            $('<th />').html(ord.own == 0 ? '' : Math.floor(ord.own))
          );
          return table.append(row);
        }, $('<table />').attr({}))
      );
      $('#bids').html(
        data.bids.slice(0, 16).reduce((table, ord) => {
          let row = $('<tr />');
          row.append($('<th />').html(parseFloat(ord.price).toPrecision(5)));
          row.append($('<th />').html(Math.floor(ord.tokens)));
          row.append($('<th />').html(ord.exchange));
          row.append($('<th />').html(ord.own == 0 ? '' : Math.floor(ord.own)));
          return table.append(row);
        }, $('<table />').attr({}))
      );
    }

    let exchanges = data.asks
      .concat(data.bids.slice(0, maxbook))
      .reduce(
        (exc, itm) =>
        exc.indexOf(itm.exchange) > -1 ? exc : exc.concat([itm.exchange]), []
      )
      .sort();

    $('#exc' + entryno).html(exchanges.join(' '));
  });
});
/*
  socket.on("arb", function(data1) {
    $("#arb").html(JSON.stringify(data1));
    loco.play();
  });
*/
