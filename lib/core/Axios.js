'use strict';

var utils = require('./../utils');
var buildURL = require('../helpers/buildURL');
var InterceptorManager = require('./InterceptorManager');
var dispatchRequest = require('./dispatchRequest');
var mergeConfig = require('./mergeConfig');

/**
 * Create a new instance of Axios
 *
 * @param {Object} instanceConfig The default config for the instance
 */
function Axios(instanceConfig) {
  this.defaults = instanceConfig;
  this.interceptors = {
    request: new InterceptorManager(),
    response: new InterceptorManager()
  };
}

/**
 * Dispatch a request
 *
 * @param {Object} config The config specific for this request (merged with this.defaults)
 */
// 最核心的方法就是他了。其他的方法，都是包装了一下固定参数给出去而已，例如 axios.get、axios.post 等。
Axios.prototype.request = function request(config) {
  /*eslint no-param-reassign:0*/
  // Allow for axios('example/url'[, config]) a la fetch API
  if (typeof config === 'string') {
    config = arguments[1] || {};
    config.url = arguments[0];
  } else {
    config = config || {};
  }

  config = mergeConfig(this.defaults, config);

  // Set config.method
  if (config.method) {
    config.method = config.method.toLowerCase();
  } else if (this.defaults.method) {
    config.method = this.defaults.method.toLowerCase();
  } else {
    config.method = 'get';
  }

  /**
   * 在这里定义了 chain 中 dispatchRequest 这个请求方法。
   * 在 request.use 注册的 interceptors，将会放在请求之前。
   * 在 response.use 注册的 interceptors，将会放在请求之后。
   *
   * 而初始传入到 promise 中的，是 config。
   *
   * 整合起来，整个 promise.then 的调用过程就是：[
   *  initialize,                            --> config
   *  requestFulfilled1, requestRejected1,   --> config1
   *  requestFulfilled2, requestRejected2,   --> config2
   *  ...,                                   --> configN
   *  dispatchRequest, undefined,            --> response
   *  responseFulfilled1, responseRejected1, --> response1
   *  responseFulfilled2, responseRejected2, --> response2
   *  ...,                                   --> responseN
   * ]
   */
  // Hook up interceptors middleware
  // 【高】dispatchRequest 是请求处理函数，重中之重
  var chain = [dispatchRequest, undefined];
  var promise = Promise.resolve(config);

  this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
    // 这里存放的是 interceptors.use 传入的中间函数
    // request 是放在头部的
    // fulfilled 中丢出去的结果，将会被下一个 then 接收，最终把处理好的 config 当做请求体发送出去。这里传入的应该是 config。
    chain.unshift(interceptor.fulfilled, interceptor.rejected);
  });

  this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
    // response 是放在尾部的
    // fulfilled 中丢出去的结果，将会被下一个 自定义 fulfilled 接收。最终把结果给到调用侧。
    chain.push(interceptor.fulfilled, interceptor.rejected);
  });

  // 通过 promise.then 不断运行 chain 中的方法
  // chain 的排序为：[fulfilled1, rejected1, fulfilled2, rejected2, ...]
  // 按 promise.then(resolve, reject) 的方式传入
  while (chain.length) {
    promise = promise.then(chain.shift(), chain.shift());
  }

  return promise;
};

Axios.prototype.getUri = function getUri(config) {
  config = mergeConfig(this.defaults, config);
  return buildURL(config.url, config.params, config.paramsSerializer).replace(/^\?/, '');
};

// Provide aliases for supported request methods
// 这里的 data 是从 config 中提取的。why？这个定义是跟什么关联的呢？
utils.forEach(['delete', 'get', 'head', 'options'], function forEachMethodNoData(method) {
  /*eslint func-names:0*/
  Axios.prototype[method] = function(url, config) {
    return this.request(mergeConfig(config || {}, {
      method: method,
      url: url,
      data: (config || {}).data
    }));
  };
});

// 这里的 data 是从传参中提取的
utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
  /*eslint func-names:0*/
  Axios.prototype[method] = function(url, data, config) {
    return this.request(mergeConfig(config || {}, {
      method: method,
      url: url,
      data: data
    }));
  };
});

module.exports = Axios;
