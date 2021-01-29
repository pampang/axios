'use strict';

// 【低】工具方法
var utils = require('./utils');
// 【低】工具方法
var bind = require('./helpers/bind');
// 【高】核心
var Axios = require('./core/Axios');
// 【中】工具方法。可以关注它是怎么做 config 的合并的，为什么要独立出一个方法来。
var mergeConfig = require('./core/mergeConfig');
// 【中】默认配置。axios 是怎么做默认配置的管理的？
var defaults = require('./defaults');

/**
 * 本身有一个构造器，对外都是用实例的形式出去（module.exports.default 是 axios）。
 * 这样的好处是什么？可以制造多个互不相干的闭包，以保证不同用途下的数据的干净？
 */

/**
 * Create an instance of Axios
 *
 * @param {Object} defaultConfig The default config for the instance
 * @return {Axios} A new instance of Axios
 */
function createInstance(defaultConfig) {
  var context = new Axios(defaultConfig);
  // 给 request 方法绑定 this。把 context 当做是 this 变量，bind 到 request 这个方法中
  // 这里的 bind，其实是让 axios() 这个方法生效。axios() 背后的逻辑，其实就是 axios.request()。
  var instance = bind(Axios.prototype.request, context);

  // Copy axios.prototype to instance
  utils.extend(instance, Axios.prototype, context);

  // Copy context to instance
  utils.extend(instance, context);

  return instance;
}

// 我们所配置的 axios 本身也是一个实例。
// Create the default instance to be exported
var axios = createInstance(defaults);

// Expose Axios class to allow class inheritance
axios.Axios = Axios;

// Factory for creating new instances
axios.create = function create(instanceConfig) {
  // 通过 mergeConfig 合并了默认配置和用户配置之后，再去创建
  return createInstance(mergeConfig(axios.defaults, instanceConfig));
};

// Expose Cancel & CancelToken
axios.Cancel = require('./cancel/Cancel');
axios.CancelToken = require('./cancel/CancelToken');
axios.isCancel = require('./cancel/isCancel');

// // Expose all/spread
// axios.all = function all(promises) {
//   return Promise.all(promises);
// };
// axios.spread = require('./helpers/spread');

// 这个方法的用途是什么？
// Expose isAxiosError
axios.isAxiosError = require('./helpers/isAxiosError');

module.exports = axios;

// FIXME: 这个需要再探究一下为什么，估计会大有收获。
// Allow use of default import syntax in TypeScript
module.exports.default = axios;
