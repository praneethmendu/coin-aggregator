/*
Add your ethereum address to the mainacct variable
Coins can be added to alltokens variable, the information required for this can be found on etherscan
if you have a Eth node provider add it to the providerAdd variable, you can make one at infura.io
*/

exports.listnr = (gloBus, runList) => {

  const mainacct = 'YOUR_ETH_ADDRESS_HERE';
  const providerAdd = 'https://mainnet.infura.io/'
  const alltokens = [{
      name: 'REP',
      addr: '0x1985365e9f78359a9B6AD760e32412f4a445E862',
      decimals: 18,
      book: {
        asks: [],
        bids: []
      },
      bal: 0
    },
    {
    {
      name: 'BAT',
      addr: '0x0d8775f648430679a709e98d2b0cb6250d2887ef',
      decimals: 18,
      book: {
        asks: [],
        bids: []
      },
      bal: 0
    },
    {
      name: 'KNC',
      addr: '0xdd974d5c2e2928dea5f71b9825b8b646686bd200',
      decimals: 18,
      book: {
        asks: [],
        bids: []
      },
      bal: 0
    },
    {
      name: 'OMG',
      addr: '0xd26114cd6EE289AccF82350c8d8487fedB8A0C07',
      decimals: 18,
      book: {
        asks: [],
        bids: []
      },
      bal: 0
    },
    {
      name: 'LINK',
      addr: '0x514910771af9ca656af840dff83e8264ecf986ca',
      decimals: 18,
      book: {
        asks: [],
        bids: []
      },
      bal: 0
    }
  ];

  // socket
  const io = require('socket.io-client');
  // const socketURL = 'https://socket.etherdelta.com';
  const socketURL = 'https://api.forkdelta.com';
  const socket = io.connect(socketURL, {
    transports: ['websocket']
  });
  const BigNumber = require('bignumber.js');


  let tokens = alltokens.filter(elem => runList.indexOf(elem.name) > -1);
  let main = {};
  main.zero = '0x0000000000000000000000000000000000000000';

  let record = {};
  tokens
    .map(dmmy => dmmy.name)
    .concat(['ETH'])
    .map(each1 => {
      record[each1] = 0;
    });

  const minEth = 0.05;
  const pricePrecision = 6;

  // helper functions
  const clean = elem => {
    let cleanpr = new BigNumber(elem.availableVolume);
    let tok = elem.tokenGet == main.zero ? elem.tokenGive : elem.tokenGet;
    return {
      id: elem.id,
      tokens: cleanpr
        .div(
          Math.pow(
            10,
            tokens.find(i => i.addr.toUpperCase() == tok.toUpperCase()).decimals
          )
        )
        .toPrecision(pricePrecision),
      price: parseFloat(elem.price),
      ineth: elem.ethAvailableVolumeBase,
      user: elem.user
    };
  };

  const sendOrder = tok => {
    gloBus.emit('order', {
      asks: tok.book.asks.map(item => {
        return {
          own: item.user.toUpperCase() == mainacct.toUpperCase() ? item.tokens : 0,
          tokens: item.tokens,
          price: item.price,
          exchange: 'ede'
        };
      }),
      bids: tok.book.bids.map(item => {
        return {
          own: item.user.toUpperCase() == mainacct.toUpperCase() ? item.tokens : 0,
          tokens: item.tokens,
          price: item.price,
          exchange: 'ede'
        };
      }),
      name: tok.name,
      bal: tok.bal,
      eth: main.bal
    });
  };

  // main

  let j = 0;
  let gap = 126000;
  socket.on('connect', () => {
    console.log('ede: socket connected');

    socket.emit('getMarket', {
      token: tokens[j].addr,
      user: mainacct
    });
    j = j + 1 < tokens.length ? j + 1 : 0;

    setInterval(() => {
      socket.emit('getMarket', {
        token: tokens[j].addr,
        user: mainacct
      });
      j = j + 1 < tokens.length ? j + 1 : 0;
    }, gap);
  });

  socket.on('disconnect', () => {
    console.log('ede: socket disconnected');
  });

  socket.on('market', market => {
    if (market.orders) {
      let tok = tokens.find(
        tok =>
        market.orders.buys[0].tokenGet.toUpperCase() == tok.addr.toUpperCase()
      );
      let countasks = 0,
        countbids = 0;
      tok.book = {
        asks: market.orders.sells
          .filter(elem => {
            if (elem.ethAvailableVolumeBase > minEth && countasks < 15) {
              countasks++;
              return true;
            }
            return false;
          })
          .map(elem => {
            return clean(elem);
          }),
        bids: market.orders.buys
          .filter(elem => {
            if (elem.ethAvailableVolumeBase > minEth && countbids < 15) {
              countbids++;
              return true;
            }
            return false;
          })
          .map(elem => {
            return clean(elem);
          })
      };
      sendOrder(tok);
      console.log('init book', tok.name);
    } else console.log('unexpectd obj');
  });

  socket.on('orders', ord => {
    tokens.map(tok => {
      let bookAdd = {
        bids: ord.buys.filter(buyElem => {
          return buyElem.tokenGet.toUpperCase() == tok.addr.toUpperCase();
        }),
        asks: ord.sells.filter(sellElm => {
          return sellElm.tokenGive.toUpperCase() == tok.addr.toUpperCase();
        })
      };
      if (
        JSON.stringify(bookAdd) !=
        JSON.stringify({
          bids: [],
          asks: []
        })
      ) {
        // filtered orders for each tok
        bookAdd.bids.map(buy => {
          if (buy.deleted == true) {
            let entry =
              1 + tok.book.bids.findIndex(oldbuy => oldbuy.id == buy.id);
            if (entry > 0) {
              // console.log('ede : buy order deleted', tok.book.bids[entry - 1]);
              tok.book.bids.splice(entry - 1, 1);
              sendOrder(tok);
            }
          } else {
            let entry =
              1 + tok.book.bids.findIndex(oldbuy => oldbuy.price < buy.price);
            if (entry > 0) {
              // console.log('ede : sell order added', clean(buy));
              tok.book.bids.splice(entry - 1, 0, clean(buy));
              tok.book.bids = tok.book.bids.filter(bid => bid.ineth > minEth);
              sendOrder(tok);
            }
          }
        });

        bookAdd.asks.map(sell => {
          if (sell.deleted == true) {
            let entry =
              1 + tok.book.asks.findIndex(oldsell => oldsell.id == sell.id);
            if (entry > 0) {
              // console.log('ede : sell order deleted', tok.book.asks[entry - 1]);
              tok.book.asks.splice(entry - 1, 1);
              sendOrder(tok);
            }
          } else {
            let entry =
              1 +
              tok.book.asks.findIndex(oldsell => oldsell.price > sell.price);
            if (entry > 0) {
              // console.log('ede : sell order added', clean(sell));
              tok.book.asks.splice(entry - 1, 0, clean(sell));
              tok.book.adks = tok.book.asks.filter(ask => ask.ineth > minEth);
              sendOrder(tok);
            }
          }
        });
      }
    });
  });
  socket.on('myTrades', tra => {
    console.log(tra);
  });

  socket.on('trades', tra => {
    tokens.map(tok => {
      let filt = tra.filter(traElem => {
        return traElem.tokenAddr.toUpperCase() == tok.addr.toUpperCase();
      });
      filt.map(i => {
        // console.log('matching trads', i);
      });
      filt.map(singleTrade => {
        let clean = new BigNumber(singleTrade.price);
        clean = parseFloat(clean.toPrecision(pricePrecision));
        if (singleTrade.side == 'sell') {
          tok.book.bids.map(buyEntry => {
            if (
              singleTrade.buyer.toUpperCase() == buyEntry.user.toUpperCase() &&
              clean == buyEntry.price &&
              singleTrade.amount <= buyEntry.tokens
            ) {
              buyEntry.tokens = buyEntry.tokens - singleTrade.amount;
              buyEntry.ineth = buyEntry.ineth - singleTrade.amountBase;

              tok.book.bids = tok.book.bids.filter(bid => bid.ineth > minEth);
              // console.log('ede : buy order changed', singleTrade);
              sendOrder(tok);
              if (singleTrade.buyer.toUpperCase() == mainacct.toUpperCase()) {
                console.log('singsong');
                gloBus.emit('trade', {
                  price: clean,
                  tokens: singleTrade.amount,
                  exchange: tok.name + 'ede',
                  uxtime: Date.now()
                });
              }
            }
          });
        } else if (singleTrade.side == 'buy') {
          tok.book.asks.map(sellEntry => {
            if (
              singleTrade.seller.toUpperCase() ==
              sellEntry.user.toUpperCase() &&
              clean == sellEntry.price &&
              singleTrade.amount <= sellEntry.tokens
            ) {
              sellEntry.tokens = sellEntry.tokens - singleTrade.amount;
              sellEntry.ineth = sellEntry.ineth - singleTrade.amountBase;

              tok.book.bids = tok.book.bids.filter(bid => bid.ineth > minEth);
              console.log('ede : sell order changed');
              sendOrder(tok);
              if (singleTrade.seller.toUpperCase() == mainacct.toUpperCase()) {
                console.log('singsong');
                gloBus.emit('trade', {
                  price: clean,
                  tokens: singleTrade.amount,
                  exchange: tok.name + 'ede',
                  uxtime: Date.now()
                });
              }
            }
          });
        }
      });
    });
  });

  // direct chain interaction
  let Web3 = require('web3');
  web3 = new Web3(
    new Web3.providers.HttpProvider(
      providerAdd
    )
  );

  let abi = [{
      constant: false,
      inputs: [{
          name: 'tokenGet',
          type: 'address'
        },
        {
          name: 'amountGet',
          type: 'uint256'
        },
        {
          name: 'tokenGive',
          type: 'address'
        },
        {
          name: 'amountGive',
          type: 'uint256'
        },
        {
          name: 'expires',
          type: 'uint256'
        },
        {
          name: 'nonce',
          type: 'uint256'
        },
        {
          name: 'user',
          type: 'address'
        },
        {
          name: 'v',
          type: 'uint8'
        },
        {
          name: 'r',
          type: 'bytes32'
        },
        {
          name: 's',
          type: 'bytes32'
        },
        {
          name: 'amount',
          type: 'uint256'
        }
      ],
      name: 'trade',
      outputs: [],
      payable: false,
      type: 'function'
    },
    {
      constant: false,
      inputs: [{
          name: 'tokenGet',
          type: 'address'
        },
        {
          name: 'amountGet',
          type: 'uint256'
        },
        {
          name: 'tokenGive',
          type: 'address'
        },
        {
          name: 'amountGive',
          type: 'uint256'
        },
        {
          name: 'expires',
          type: 'uint256'
        },
        {
          name: 'nonce',
          type: 'uint256'
        }
      ],
      name: 'order',
      outputs: [],
      payable: false,
      type: 'function'
    },
    {
      constant: true,
      inputs: [{
        name: '',
        type: 'address'
      }, {
        name: '',
        type: 'bytes32'
      }],
      name: 'orderFills',
      outputs: [{
        name: '',
        type: 'uint256'
      }],
      payable: false,
      type: 'function'
    },
    {
      constant: false,
      inputs: [{
          name: 'tokenGet',
          type: 'address'
        },
        {
          name: 'amountGet',
          type: 'uint256'
        },
        {
          name: 'tokenGive',
          type: 'address'
        },
        {
          name: 'amountGive',
          type: 'uint256'
        },
        {
          name: 'expires',
          type: 'uint256'
        },
        {
          name: 'nonce',
          type: 'uint256'
        },
        {
          name: 'v',
          type: 'uint8'
        },
        {
          name: 'r',
          type: 'bytes32'
        },
        {
          name: 's',
          type: 'bytes32'
        }
      ],
      name: 'cancelOrder',
      outputs: [],
      payable: false,
      type: 'function'
    },
    {
      constant: false,
      inputs: [{
        name: 'amount',
        type: 'uint256'
      }],
      name: 'withdraw',
      outputs: [],
      payable: false,
      type: 'function'
    },
    {
      constant: false,
      inputs: [{
          name: 'token',
          type: 'address'
        },
        {
          name: 'amount',
          type: 'uint256'
        }
      ],
      name: 'depositToken',
      outputs: [],
      payable: false,
      type: 'function'
    },
    {
      constant: true,
      inputs: [{
          name: 'tokenGet',
          type: 'address'
        },
        {
          name: 'amountGet',
          type: 'uint256'
        },
        {
          name: 'tokenGive',
          type: 'address'
        },
        {
          name: 'amountGive',
          type: 'uint256'
        },
        {
          name: 'expires',
          type: 'uint256'
        },
        {
          name: 'nonce',
          type: 'uint256'
        },
        {
          name: 'user',
          type: 'address'
        },
        {
          name: 'v',
          type: 'uint8'
        },
        {
          name: 'r',
          type: 'bytes32'
        },
        {
          name: 's',
          type: 'bytes32'
        }
      ],
      name: 'amountFilled',
      outputs: [{
        name: '',
        type: 'uint256'
      }],
      payable: false,
      type: 'function'
    },
    {
      constant: true,
      inputs: [{
        name: '',
        type: 'address'
      }, {
        name: '',
        type: 'address'
      }],
      name: 'tokens',
      outputs: [{
        name: '',
        type: 'uint256'
      }],
      payable: false,
      type: 'function'
    },
    {
      constant: false,
      inputs: [{
        name: 'feeMake_',
        type: 'uint256'
      }],
      name: 'changeFeeMake',
      outputs: [],
      payable: false,
      type: 'function'
    },
    {
      constant: true,
      inputs: [],
      name: 'feeMake',
      outputs: [{
        name: '',
        type: 'uint256'
      }],
      payable: false,
      type: 'function'
    },
    {
      constant: false,
      inputs: [{
        name: 'feeRebate_',
        type: 'uint256'
      }],
      name: 'changeFeeRebate',
      outputs: [],
      payable: false,
      type: 'function'
    },
    {
      constant: true,
      inputs: [],
      name: 'feeAccount',
      outputs: [{
        name: '',
        type: 'address'
      }],
      payable: false,
      type: 'function'
    },
    {
      constant: true,
      inputs: [{
          name: 'tokenGet',
          type: 'address'
        },
        {
          name: 'amountGet',
          type: 'uint256'
        },
        {
          name: 'tokenGive',
          type: 'address'
        },
        {
          name: 'amountGive',
          type: 'uint256'
        },
        {
          name: 'expires',
          type: 'uint256'
        },
        {
          name: 'nonce',
          type: 'uint256'
        },
        {
          name: 'user',
          type: 'address'
        },
        {
          name: 'v',
          type: 'uint8'
        },
        {
          name: 'r',
          type: 'bytes32'
        },
        {
          name: 's',
          type: 'bytes32'
        },
        {
          name: 'amount',
          type: 'uint256'
        },
        {
          name: 'sender',
          type: 'address'
        }
      ],
      name: 'testTrade',
      outputs: [{
        name: '',
        type: 'bool'
      }],
      payable: false,
      type: 'function'
    },
    {
      constant: false,
      inputs: [{
        name: 'feeAccount_',
        type: 'address'
      }],
      name: 'changeFeeAccount',
      outputs: [],
      payable: false,
      type: 'function'
    },
    {
      constant: true,
      inputs: [],
      name: 'feeRebate',
      outputs: [{
        name: '',
        type: 'uint256'
      }],
      payable: false,
      type: 'function'
    },
    {
      constant: false,
      inputs: [{
        name: 'feeTake_',
        type: 'uint256'
      }],
      name: 'changeFeeTake',
      outputs: [],
      payable: false,
      type: 'function'
    },
    {
      constant: false,
      inputs: [{
        name: 'admin_',
        type: 'address'
      }],
      name: 'changeAdmin',
      outputs: [],
      payable: false,
      type: 'function'
    },
    {
      constant: false,
      inputs: [{
          name: 'token',
          type: 'address'
        },
        {
          name: 'amount',
          type: 'uint256'
        }
      ],
      name: 'withdrawToken',
      outputs: [],
      payable: false,
      type: 'function'
    },
    {
      constant: true,
      inputs: [{
        name: '',
        type: 'address'
      }, {
        name: '',
        type: 'bytes32'
      }],
      name: 'orders',
      outputs: [{
        name: '',
        type: 'bool'
      }],
      payable: false,
      type: 'function'
    },
    {
      constant: true,
      inputs: [],
      name: 'feeTake',
      outputs: [{
        name: '',
        type: 'uint256'
      }],
      payable: false,
      type: 'function'
    },
    {
      constant: false,
      inputs: [],
      name: 'deposit',
      outputs: [],
      payable: true,
      type: 'function'
    },
    {
      constant: false,
      inputs: [{
        name: 'accountLevelsAddr_',
        type: 'address'
      }],
      name: 'changeAccountLevelsAddr',
      outputs: [],
      payable: false,
      type: 'function'
    },
    {
      constant: true,
      inputs: [],
      name: 'accountLevelsAddr',
      outputs: [{
        name: '',
        type: 'address'
      }],
      payable: false,
      type: 'function'
    },
    {
      constant: true,
      inputs: [{
          name: 'token',
          type: 'address'
        },
        {
          name: 'user',
          type: 'address'
        }
      ],
      name: 'balanceOf',
      outputs: [{
        name: '',
        type: 'uint256'
      }],
      payable: false,
      type: 'function'
    },
    {
      constant: true,
      inputs: [],
      name: 'admin',
      outputs: [{
        name: '',
        type: 'address'
      }],
      payable: false,
      type: 'function'
    },
    {
      constant: true,
      inputs: [{
          name: 'tokenGet',
          type: 'address'
        },
        {
          name: 'amountGet',
          type: 'uint256'
        },
        {
          name: 'tokenGive',
          type: 'address'
        },
        {
          name: 'amountGive',
          type: 'uint256'
        },
        {
          name: 'expires',
          type: 'uint256'
        },
        {
          name: 'nonce',
          type: 'uint256'
        },
        {
          name: 'user',
          type: 'address'
        },
        {
          name: 'v',
          type: 'uint8'
        },
        {
          name: 'r',
          type: 'bytes32'
        },
        {
          name: 's',
          type: 'bytes32'
        }
      ],
      name: 'availableVolume',
      outputs: [{
        name: '',
        type: 'uint256'
      }],
      payable: false,
      type: 'function'
    },
    {
      inputs: [{
          name: 'admin_',
          type: 'address'
        },
        {
          name: 'feeAccount_',
          type: 'address'
        },
        {
          name: 'accountLevelsAddr_',
          type: 'address'
        },
        {
          name: 'feeMake_',
          type: 'uint256'
        },
        {
          name: 'feeTake_',
          type: 'uint256'
        },
        {
          name: 'feeRebate_',
          type: 'uint256'
        }
      ],
      payable: false,
      type: 'constructor'
    },
    {
      payable: false,
      type: 'fallback'
    },
    {
      anonymous: false,
      inputs: [{
          indexed: false,
          name: 'tokenGet',
          type: 'address'
        },
        {
          indexed: false,
          name: 'amountGet',
          type: 'uint256'
        },
        {
          indexed: false,
          name: 'tokenGive',
          type: 'address'
        },
        {
          indexed: false,
          name: 'amountGive',
          type: 'uint256'
        },
        {
          indexed: false,
          name: 'expires',
          type: 'uint256'
        },
        {
          indexed: false,
          name: 'nonce',
          type: 'uint256'
        },
        {
          indexed: false,
          name: 'user',
          type: 'address'
        }
      ],
      name: 'Order',
      type: 'event'
    },
    {
      anonymous: false,
      inputs: [{
          indexed: false,
          name: 'tokenGet',
          type: 'address'
        },
        {
          indexed: false,
          name: 'amountGet',
          type: 'uint256'
        },
        {
          indexed: false,
          name: 'tokenGive',
          type: 'address'
        },
        {
          indexed: false,
          name: 'amountGive',
          type: 'uint256'
        },
        {
          indexed: false,
          name: 'expires',
          type: 'uint256'
        },
        {
          indexed: false,
          name: 'nonce',
          type: 'uint256'
        },
        {
          indexed: false,
          name: 'user',
          type: 'address'
        },
        {
          indexed: false,
          name: 'v',
          type: 'uint8'
        },
        {
          indexed: false,
          name: 'r',
          type: 'bytes32'
        },
        {
          indexed: false,
          name: 's',
          type: 'bytes32'
        }
      ],
      name: 'Cancel',
      type: 'event'
    },
    {
      anonymous: false,
      inputs: [{
          indexed: false,
          name: 'tokenGet',
          type: 'address'
        },
        {
          indexed: false,
          name: 'amountGet',
          type: 'uint256'
        },
        {
          indexed: false,
          name: 'tokenGive',
          type: 'address'
        },
        {
          indexed: false,
          name: 'amountGive',
          type: 'uint256'
        },
        {
          indexed: false,
          name: 'get',
          type: 'address'
        },
        {
          indexed: false,
          name: 'give',
          type: 'address'
        }
      ],
      name: 'Trade',
      type: 'event'
    },
    {
      anonymous: false,
      inputs: [{
          indexed: false,
          name: 'token',
          type: 'address'
        },
        {
          indexed: false,
          name: 'user',
          type: 'address'
        },
        {
          indexed: false,
          name: 'amount',
          type: 'uint256'
        },
        {
          indexed: false,
          name: 'balance',
          type: 'uint256'
        }
      ],
      name: 'Deposit',
      type: 'event'
    },
    {
      anonymous: false,
      inputs: [{
          indexed: false,
          name: 'token',
          type: 'address'
        },
        {
          indexed: false,
          name: 'user',
          type: 'address'
        },
        {
          indexed: false,
          name: 'amount',
          type: 'uint256'
        },
        {
          indexed: false,
          name: 'balance',
          type: 'uint256'
        }
      ],
      name: 'Withdraw',
      type: 'event'
    }
  ];

  let MyContract = web3.eth.contract(abi);
  // initiate contract for an address
  let myContractInstance = MyContract.at(
    '0x8d12a197cb00d4747a1fe03395095ce2a5cc6819'
  );

  function balance(arr) {
    arr.map(tok => {
      // account bal
      if (tok == 'ETH') {
        let free = web3.eth.getBalance(mainacct).div(Math.pow(10, 18));
        gloBus.emit('balance', {
          symbol: tok,
          coins: free,
          exchange: 'edef'
        });
        let locked = myContractInstance
          .balanceOf(main.zero, mainacct)
          .div(Math.pow(10, 18));
        record[tok] = locked;
        gloBus.emit('balance', {
          symbol: tok,
          coins: locked,
          exchange: 'edel'
        });
      } else {
        let holdingEntry = tokens.find(dummy => dummy.name == tok);
        web3.eth.call({
            // '0x70a08231' is the contract 'balanceOf()' ERC20 token function in hex. A zero buffer is required and then we add the previously defined address with tokens
            to: holdingEntry.addr, // Contract address in question
            data: '0x70a08231000000000000000000000000' + mainacct.substring(2) // contractData
          },
          function(err, result) {
            if (result) {
              let tokenbal = web3.toDecimal(result);
              //  .div(Math.pow(10, holdingEntry.decimals));
              gloBus.emit('balance', {
                symbol: tok,
                coins: tokenbal / Math.pow(10, holdingEntry.decimals),
                exchange: 'edef'
              });
            } else {
              console.log('web3 call fail', err);
            }
          }
        );

        let locked = myContractInstance
          .balanceOf(holdingEntry.addr, mainacct)
          .div(Math.pow(10, holdingEntry.decimals));
        record[tok] = locked;
        gloBus.emit('balance', {
          symbol: tok,
          coins: locked,
          exchange: 'edel'
        });
      }
    });
  }
  gloBus.on('ready', balls => {
    balance(tokens.map(dmmy => dmmy.name).concat(['ETH']));
  });

  // blockTracker
  const Eth = require('ethjs');
  const HttpProvider = require('ethjs-provider-http');
  const BlockTracker = require('eth-block-tracker');

  const provider = new HttpProvider(providerAdd);
  const blockTracker = new BlockTracker({
    provider
  });
  const eth = new Eth(provider);
  const user = mainacct;
  const ethd = '0x8d12a197cb00d4747a1fe03395095ce2a5cc6819';

  blockTracker.on('block', newBlock => {
    console.log('number', Eth.toBN(newBlock.number).toNumber());
    newBlock.transactions.map(tr => {
      if (tr.from) {
        if (tr.from.toUpperCase() == user.toUpperCase()) {
          eth.getTransactionReceipt(tr.hash).then(k => {
            if (k.status[2] == '1') {
              console.log('taker bro', tr.hash);
              gloBus.emit('play', 'wee-tziu.mp3');
            } else {
              console.log('fail bro', tr.hash);
              gloBus.emit('play', 'laughing-guy.mp3');
            }
            balance(tokens.map(dmmy => dmmy.name).concat(['ETH']));
          });
        }
      }
    });

    newBlock.transactions.map(tr => {
      if (tr.to) {
        if (tr.to.toUpperCase() == ethd.toUpperCase()) {
          if (tr.input.slice(0, 10) == '0x0a19b14a') {
            if (
              tr.input.slice(418, 458).toUpperCase() ==
              user.slice(2, 42).toUpperCase()
            ) {
              console.log('maker bro', tr.hash);
              gloBus.emit('play', 'martian-gun.mp3');
              balance(tokens.map(dmmy => dmmy.name).concat(['ETH']));
            }
          }
        }
      }
    });
  });

  blockTracker.start();

};
