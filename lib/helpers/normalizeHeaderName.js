'use strict';

var utils = require('../utils');

// 把 header 中的各个名字的大小写转正确。如 content-type -> Content-Type
module.exports = function normalizeHeaderName(headers, normalizedName) {
  utils.forEach(headers, function processHeader(value, name) {
    if (name !== normalizedName && name.toUpperCase() === normalizedName.toUpperCase()) {
      headers[normalizedName] = value;
      delete headers[name];
    }
  });
};
