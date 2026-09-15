window.ROCK_CONFIG = Object.freeze({
  brand: {
    name: 'ROCK',
    tagline: 'POWER YOUR EVERYDAY',
    supportEmail: 'hello@rock.sa'
  },
  storefront: {
    defaultLocale: 'ar-SA',
    supportedLocales: ['ar-SA', 'en-SA'],
    defaultMarket: 'SA',
    supportedMarkets: ['SA', 'AE', 'KW', 'QA', 'BH', 'OM', 'US', 'GB'],
    defaultCurrency: 'SAR',
    supportedCurrencies: ['SAR', 'AED', 'KWD', 'QAR', 'BHD', 'OMR', 'USD', 'GBP']
  },
  currency: {
    SAR: { locale: 'ar-SA', minorUnit: 2 },
    AED: { locale: 'en-AE', minorUnit: 2 },
    KWD: { locale: 'en-KW', minorUnit: 3 },
    QAR: { locale: 'en-QA', minorUnit: 2 },
    BHD: { locale: 'en-BH', minorUnit: 3 },
    OMR: { locale: 'en-OM', minorUnit: 3 },
    USD: { locale: 'en-US', minorUnit: 2 },
    GBP: { locale: 'en-GB', minorUnit: 2 }
  },
  fx: {
    // Reference rates for storefront preview only. Production checkout must use a server-side rate provider.
    base: 'SAR',
    SAR: 1,
    AED: 0.979,
    KWD: 0.0816,
    QAR: 0.992,
    BHD: 0.100,
    OMR: 0.102,
    USD: 0.267,
    GBP: 0.198
  },
  capabilities: {
    catalog: true,
    cart: true,
    multiLanguage: true,
    multiCurrencyPreview: true,
    customerAccounts: false,
    payments: false,
    internationalShipping: false,
    orderApi: false,
    taxEngine: false,
    inventoryApi: false
  },
  productionServices: {
    catalogApi: '/api/catalog',
    checkoutApi: '/api/checkout',
    ordersApi: '/api/orders',
    customerApi: '/api/customer',
    shippingApi: '/api/shipping',
    taxApi: '/api/tax',
    paymentApi: '/api/payment'
  }
});
