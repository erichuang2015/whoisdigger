const util = require('util'),
  whois = require('whois'),
  lookupProm = util.promisify(whois.lookup),
  parseRawData = require('./parse-raw-data.js'),
  debug = require('debug')('whoiswrapper');

var {
  appSettings
} = require('../appsettings.js');

var defaultoptions = appSettings.lookupdefault;

async function lookup(domain, options = defaultoptions) {
  var domainResults = await lookupProm(domain, options).catch(function(err) {
    debug(err);
    return err;
  });
  return domainResults;
}

function toJSON(resultsText) {
  if (typeof resultsText === 'object') {
    JSON.stringify(resultsText, null, 2);
    resultsJSON = resultsText.map(function(data) {
      data.data = parseRawData(data.data);
      return data;
    });
  } else {
    resultsJSON = parseRawData(resultsText);
  }

  return resultsJSON;
}

// Is domain available (Results in plain text, Results in JSON format)
function isDomainAvailable(resultsText, resultsJSON) {
  resultsJSON = resultsJSON || 0;
  if (resultsJSON === 0) {
    resultsJSON = toJSON(resultsText);
  }

  switch (true) {
    case (resultsText.includes('Uniregistry') && resultsText.includes('Query limit exceeded')):
      if (appSettings.misc.assumeuniregistryasunavailable == true) {
        return 'unavailable';
      } else {
        return 'querylimituniregistry';
      }
      break;
    case (resultsText == null):
    case (resultsText == ''):
    case (resultsJSON.hasOwnProperty('error')):
    case (resultsJSON.hasOwnProperty('errno')):
    case (resultsText.includes('You  are  not  authorized  to  access or query our Whois')):
    case (resultsText.includes('ERROR:101:')):
    case (resultsText.includes('IP Address Has Reached Rate Limit')):
      return 'error';
      break;
    case (resultsJSON.hasOwnProperty('domainName')):
    case (resultsText.includes('Domain Status:ok')):
    case (Object.keys(resultsJSON).length > 5):
    case (resultsText.includes('organisation: Internet Assigned Numbers Authority')):
      return 'unavailable';
      break;
    default:
      return 'available';
      break;
  }
}

module.exports = {
  lookup: lookup,
  toJSON: toJSON,
  isDomainAvailable: isDomainAvailable
};
