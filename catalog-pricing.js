/* ROCK 2026 price-list integration. Distribution prices are taken from the 2026 price list. */
(() => {
  const catalogMeta = {
    rkch720: { model: 'RKCH720', barcode: '850079508101', price: 15 },
    rkch735: { model: 'RKCH735', barcode: '850079508118', price: 20 },
    rkch765: { model: 'RKCH765', barcode: '850079508125', price: 40 },
    car30: { model: 'C43', barcode: '6942433007802', price: 46 },
    sd017: { model: 'SD-017', barcode: '6974282124669', price: 40 },
    nc20: { model: 'NC-20', barcode: '6975653086586', price: 12 },
    pods700: { model: 'RO-700W', barcode: '0002020070285', price: 79 },
    eb200: { model: 'RAU0785', barcode: '6942433007826', price: 59 },
    eb710: { model: 'RAU0788', barcode: '6942433007789', price: 44 },
    s1: { model: 'RAU0790', barcode: '6942433007741', price: 50 },
    a5pro: { model: 'RAU0782', barcode: '6942433002012', price: 65 },
    ro0546t: { model: 'RO-0546T', barcode: '2509232512513', price: 14 },
    aux139: { model: 'AUX-139', barcode: '850079508187', price: 7 },
    y6: { model: 'RAU0768', barcode: '6975653083929', price: 39 },
    es09: { model: 'RAU0791', barcode: '6942433007338', price: 12 },
    rph1003: { model: 'RPH1003', barcode: '6975653088580', price: 20 },
    rph0878: { model: 'RPH0878', barcode: '6971680474976', price: 48 },
    ram0037: { model: 'RAM0037', barcode: '6942433001251', price: 28 },
    w31: { model: '118A-15W', barcode: '6941402735197', price: 15 },
    pen: { model: 'RST10860', barcode: '6975653084131', price: 39 },
    'laptop-bag': { model: 'RST10887', barcode: '6942433000049', price: 28 },
    trimmer: { model: 'RST10890', barcode: '6942433007383', price: 40 }
  };

  Object.entries(catalogMeta).forEach(([id, meta]) => {
    const product = products.find(p => p.id === id);
    if (product) Object.assign(product, {
      model: meta.model,
      barcode: meta.barcode,
      distributionPrice: meta.price,
      price: meta.price
    });
  });

  const placeholder = 'assets/products/catalog-placeholder.svg';
  const verifiedImages = {
    rkcb144: 'assets/products/c27l.webp',
    rkcb148: 'assets/products/a60c.webp',
    rkcb147: 'assets/products/cc60.webp',
    rkcb145: 'assets/products/a12m.webp',
    rcb056: 'assets/products/metal3in1.webp',
    rau0785b: 'assets/products/eb200.webp'
  };
  const add = p => { if (!products.some(x => x.id === p.id)) products.push(p); };
  const catalogImage = id => verifiedImages[id] || placeholder;

  add({id:'rkcb146',image:placeholder,name:'ROCK Fast charging cable USB-A with Lightning connector 27W - 1.0M',category:'power',label:'CABLE',desc:'ROCK Fast charging cable USB-A with Lightning connector 27W - 1.0M',price:6.25,distributionPrice:6.25,model:'RKCBL146',barcode:'850079508156',art:'catalog-art',badge:'2026',rating:null,reviews:0,bestFor:[],specs:[],imageVerified:false});
  add({id:'rkcb144',image:catalogImage('rkcb144'),name:'ROCK Fast charging cable USB-C with Lightning connector 27W - 1.0M',category:'power',label:'CABLE',desc:'ROCK Fast charging cable USB-C with Lightning connector 27W - 1.0M',price:6.25,distributionPrice:6.25,model:'RKCBL144',barcode:'850079508002',art:'catalog-art',badge:'2026',rating:null,reviews:0,bestFor:[],specs:[],imageVerified:true});
  add({id:'rkcb148',image:catalogImage('rkcb148'),name:'ROCK Fast charging cable USB-A with USB-C connector 60W - 1.0M',category:'power',label:'CABLE',desc:'ROCK Fast charging cable USB-A with USB-C connector 60W - 1.0M',price:6.25,distributionPrice:6.25,model:'RKCBL148',barcode:'850079508170',art:'catalog-art',badge:'2026',rating:null,reviews:0,bestFor:[],specs:[],imageVerified:true});
  add({id:'rkcb147',image:catalogImage('rkcb147'),name:'ROCK Fast charging cable USB-C with USB-C connector 60W - 1.0M',category:'power',label:'CABLE',desc:'ROCK Fast charging cable USB-C with USB-C connector 60W - 1.0M',price:6.25,distributionPrice:6.25,model:'RKCBL147',barcode:'850079508163',art:'catalog-art',badge:'2026',rating:null,reviews:0,bestFor:[],specs:[],imageVerified:true});
  add({id:'rkcb145',image:catalogImage('rkcb145'),name:'ROCK Fast charging cable USB-A with Micro connector 12W - 1.0M',category:'power',label:'CABLE',desc:'ROCK Fast charging cable USB-A with Micro connector 12W - 1.0M',price:6.25,distributionPrice:6.25,model:'RKCBL145',barcode:'850079508149',art:'catalog-art',badge:'2026',rating:null,reviews:0,bestFor:[],specs:[],imageVerified:true});
  add({id:'rcb056',image:catalogImage('rcb056'),name:'ROCK Fast charging cable USB-A with Lightning; Micro/Type-C charging support - 120cm',category:'power',label:'CABLE',desc:'ROCK Fast charging cable USB-A with Lightning; Micro/Type-C charging support - 120cm',price:6.25,distributionPrice:6.25,model:'RCB056',barcode:'6942433009752',art:'catalog-art',badge:'2026',rating:null,reviews:0,bestFor:[],specs:[],imageVerified:true});
  add({id:'ro701w',image:placeholder,name:'ROCK Pods 701 Bluetooth Earphones (white)',category:'audio',label:'WIRELESS EARPHONES',desc:'ROCK Pods 701 Bluetooth Earphones (white)',price:69,distributionPrice:69,model:'RO-701W',barcode:'0020210110153',art:'catalog-art',badge:'2026',rating:null,reviews:0,bestFor:[],specs:[],imageVerified:false});
  add({id:'rau0785b',image:catalogImage('rau0785b'),name:'ROCK EB TWS AI Smart Earphones (black)',category:'audio',label:'WIRELESS EARPHONES',desc:'ROCK EB TWS AI Smart Earphones (black)',price:59,distributionPrice:59,model:'RAU0785',barcode:'6942433007833',art:'catalog-art',badge:'2026',rating:null,reviews:0,bestFor:[],specs:[],imageVerified:true});
  add({id:'hp6030-silver',image:placeholder,name:'ROCK 05 Wireless Headphones (Silver)',category:'audio',label:'HEADPHONES',desc:'ROCK 05 Wireless Headphones (Silver)',price:46,distributionPrice:46,model:'HP-6030BT',barcode:'6942433007352',art:'catalog-art',badge:'2026',rating:null,reviews:0,bestFor:[],specs:[],imageVerified:false});
  add({id:'hp6030-grey',image:placeholder,name:'ROCK 05 Wireless Headphones (Grey)',category:'audio',label:'HEADPHONES',desc:'ROCK 05 Wireless Headphones (Grey)',price:46,distributionPrice:46,model:'HP-6030BT',barcode:'6942433007345',art:'catalog-art',badge:'2026',rating:null,reviews:0,bestFor:[],specs:[],imageVerified:false});
  add({id:'ro0545',image:placeholder,name:'ROCK Wired Earphone iPhone lateral in-ear (white)',category:'audio',label:'WIRED EARPHONES',desc:'ROCK Wired Earphone iPhone lateral in-ear (white)',price:15,distributionPrice:15,model:'RO-0545',barcode:'1120200120090',art:'catalog-art',badge:'2026',rating:null,reviews:0,bestFor:[],specs:[],imageVerified:false});
  add({id:'rocktag-beige',image:placeholder,name:'ROCK Tag Wireless Smart Tracker (Beige)',category:'lifestyle',label:'SMART TRACKER',desc:'ROCK Tag Wireless Smart Tracker (Beige)',price:20,distributionPrice:20,model:'ROCK Tag',barcode:'6942433005488',art:'catalog-art',badge:'2026',rating:null,reviews:0,bestFor:[],specs:[],imageVerified:false});
  add({id:'rocktag-black',image:placeholder,name:'ROCK Tag Wireless Smart Tracker (Black)',category:'lifestyle',label:'SMART TRACKER',desc:'ROCK Tag Wireless Smart Tracker (Black)',price:20,distributionPrice:20,model:'ROCK Tag',barcode:'6942433006003',art:'catalog-art',badge:'2026',rating:null,reviews:0,bestFor:[],specs:[],imageVerified:false});
  add({id:'barcode-6822154851697',image:placeholder,name:'ROCK 120W Dual-Ended Cable USB + Type-C, retractable',category:'power',label:'CABLE',desc:'ROCK 120W Dual-Ended Cable USB + Type-C, retractable',price:13,distributionPrice:13,model:null,barcode:'6822154851697',art:'catalog-art',badge:'2026',rating:null,reviews:0,bestFor:[],specs:[],imageVerified:false});
  add({id:'barcode-6815213515838',image:placeholder,name:'ROCK 68W Car Charger, 2 Type-C + USB, PD/QC',category:'car',label:'CAR CHARGER',desc:'ROCK 68W Car Charger, 2 Type-C + USB, PD/QC',price:28,distributionPrice:28,model:null,barcode:'6815213515838',art:'catalog-art',badge:'2026',rating:null,reviews:0,bestFor:[],specs:[],imageVerified:false});
  add({id:'barcode-6815213515821',image:placeholder,name:'ROCK 50W GaN Wall Charger, USB + Type-C, built-in Type-C cable',category:'power',label:'WALL CHARGER',desc:'ROCK 50W GaN Wall Charger, USB + Type-C, built-in Type-C cable',price:37,distributionPrice:37,model:null,barcode:'6815213515821',art:'catalog-art',badge:'2026',rating:null,reviews:0,bestFor:[],specs:[],imageVerified:false});
  add({id:'barcode-6815213515845',image:placeholder,name:'ROCK 45W Car Charger, USB + Type-C, dual integrated cables',category:'car',label:'CAR CHARGER',desc:'ROCK 45W Car Charger, USB + Type-C, dual integrated cables',price:36,distributionPrice:36,model:null,barcode:'6815213515845',art:'catalog-art',badge:'2026',rating:null,reviews:0,bestFor:[],specs:[],imageVerified:false});
  add({id:'barcode-6815213515814',image:placeholder,name:'ROCK Wired Type-C Headphones, ergonomic ear hook, 120cm',category:'audio',label:'HEADPHONES',desc:'ROCK Wired Type-C Headphones, ergonomic ear hook, 120cm',price:19,distributionPrice:19,model:null,barcode:'6815213515814',art:'catalog-art',badge:'2026',rating:null,reviews:0,bestFor:[],specs:[],imageVerified:false});
  add({id:'barcode-6658741587843',image:placeholder,name:'ROCK 45W GaN Wall Charger, Type-C PD + cut-resistant Type-C cable',category:'power',label:'WALL CHARGER',desc:'ROCK 45W GaN Wall Charger, Type-C PD + cut-resistant Type-C cable',price:25,distributionPrice:25,model:null,barcode:'6658741587843',art:'catalog-art',badge:'2026',rating:null,reviews:0,bestFor:[],specs:[],imageVerified:false});

  renderProducts();
  renderCart();
})();
