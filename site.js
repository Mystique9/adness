var express = require('express'),
    site = express(),
    passport = require('./passport'),
    path = require('path'),
    engine = require('ejs-locals'),
    RedisStore = require('connect-redis')(express),
    jwt = require('jsonwebtoken'),
    expressJwt = require('express-jwt'),
    router = require('./router'),
    apiRouter = require('./apiRouter'),
    config = require('./config');

// Express config on all environments
site.engine('ejs', engine);
site.set('views', path.join(__dirname, 'views'));
site.set('view engine', 'ejs');
site.use(require('./middleware/model_loader'));
site.use(require('connect-assets')());
site.use(express.favicon());
site.use(express.logger('dev'));
site.use(express.cookieParser('adness'));
site.use(express.bodyParser());
site.use(browsePrefix);
site.use(express.methodOverride());
site.use(express.json());
site.use(express.urlencoded());
site.use(express.session({
  store: new RedisStore({
    host: config.redis.host,
    port: config.redis.port,
  }),
  cookie: {
    secure: false,
    maxAge:86400000
  }
}));
site.use(passport.initialize());
site.use(passport.session());

site.use(site.router);
site.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == site.get('env')) {
  site.use(express.errorHandler());
}

// StarBurst middleware - TODO change to module
var nojsPrefix = '/sb';
function browsePrefix(req, res, next) {
  req.browsePrefix = nojsPrefix;
  return next();
}


// VIEWS - StarBurst general routes
site.get(nojsPrefix, router.sbindex);
site.get(nojsPrefix + '/rules', router.rules);
site.get(nojsPrefix + '/history', router.history);
site.get(nojsPrefix + '/registration', router.registration);
site.get(nojsPrefix + '/payment', router.payment);
site.get(nojsPrefix + '/qr/:qrString', router.qr);
// AUCTIONS
site.get(nojsPrefix + '/auctions/:auctionId', router.auction.showAuction);
site.post(nojsPrefix + '/auctions/enable/:auctionId', ensureAuthenticated, router.auction.enableAuction);
site.post(nojsPrefix + '/auctions/disable/:auctionId', ensureAuthenticated, router.auction.disableAuction);
site.post(nojsPrefix + '/auctions/edit', ensureAuthenticated, router.auction.updateAuction);
site.post(nojsPrefix + '/auctions', ensureAuthenticated, router.auction.newAuction);
site.del(nojsPrefix + '/auctions/:auctionId', ensureAuthenticated, router.auction.deleteAuction);
// BIDS
site.post(nojsPrefix + '/bids/edit', ensureAuthenticated, router.bid.updateBid);
site.del(nojsPrefix + '/bids/:bidId', ensureAuthenticated, router.bid.deleteBid);
site.post(nojsPrefix + '/bids', ensureAuthenticated, router.bid.newBid);
// ADS
site.get(nojsPrefix + '/users/:userId', ensureAuthenticated, router.profile);
site.get(nojsPrefix + '/ads/upload', ensureAuthenticated, router.ad_upload);
site.get(nojsPrefix + '/ads/:adId/edit', ensureAuthenticated, router.ad_upload);
site.get(nojsPrefix + '/ads/:adId', router.ads.getAd);
site.post(nojsPrefix + '/ads/:adId/approve', ensureAuthenticated, router.ads.approveAd);
site.post(nojsPrefix + '/ads/:adId/reject', ensureAuthenticated, router.ads.rejectAd);
site.post(nojsPrefix + '/ads/:adId/delete', ensureAuthenticated, router.ads.postDeleteAd);
site.post(nojsPrefix + '/ads/:adId', ensureAuthenticated, router.ads.updateAd);
site.post(nojsPrefix + '/ads', ensureAuthenticated, router.ads.newAd);
site.del(nojsPrefix + '/ads/:adId', ensureAuthenticated, router.ads.deleteAd);
// normal private web routes
site.get('/admin/auctions/edit/:auctionId', ensureAuthenticated, router.auction.editAuction);
site.get('/admin', ensureAuthenticated, router.admin);
// normal public web routes
site.get('/', router.index);


// api routes
var apiPrefix = '/api';
// AUCTIONS
site.get(apiPrefix + '/auctions/time', apiRouter.auctionsTime);
site.get(apiPrefix + '/auctions/open', apiRouter.auctionsOpen);
site.get(apiPrefix + '/auctions/closed', apiRouter.auctionsClosed);
site.get(apiPrefix + '/auctions/future', apiRouter.auctionsFuture);
site.get(apiPrefix + '/auctions/past', apiRouter.auctionsPast);
site.get(apiPrefix + '/auctions/:auctionId/bids', apiRouter.bids);
site.get(apiPrefix + '/auctions/:auctionId', apiRouter.auction);
site.get(apiPrefix + '/auctions', apiRouter.auctions);
site.post(apiPrefix + '/auctions/enable/:auctionId', ensureAuthenticated, apiRouter.enableAuction);
site.post(apiPrefix + '/auctions/disable/:auctionId', ensureAuthenticated, apiRouter.disableAuction);
site.post(apiPrefix + '/auctions/edit', ensureAuthenticated, apiRouter.updateAuction);
site.post(apiPrefix + '/auctions', ensureAuthenticated, apiRouter.newAuction);
site.del(apiPrefix + '/auctions/:auctionId', ensureAuthenticated, apiRouter.deleteAuction);
// BIDS
site.get(apiPrefix + '/bids/:bidId', apiRouter.bid);
site.post(apiPrefix + '/bids/edit', ensureAuthenticated, apiRouter.updateBid);
site.post(apiPrefix + '/bids', ensureAuthenticated, apiRouter.newBid);
site.del(apiPrefix + '/bids/:bidId', ensureAuthenticated, apiRouter.deleteBid);
// ADS
site.get(apiPrefix + '/ads/:adId', apiRouter.getAd);
site.post(apiPrefix + '/ads/:adId', ensureAuthenticated, apiRouter.updateAd);
site.post(apiPrefix + '/ads', ensureAuthenticated, apiRouter.newAd);
site.del(apiPrefix + '/ads/:adId', ensureAuthenticated, apiRouter.deleteAd);
site.post('/login',
  passport.authenticate('local', { failureRedirect: '/'}),
  function(req, res) {
    res.redirect(nojsPrefix + '/');
  }
);
site.get('/logout', function(req, res){
  req.logout();
  res.redirect(nojsPrefix + '/');
});

// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect(nojsPrefix + '/');
}

module.exports = site;
