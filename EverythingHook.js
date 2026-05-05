// ==UserScript==
// @name         Everything-Hook
// @namespace    https://gitee.com/HGJing/everthing-hook/
// @updateURL    https://gitee.com/HGJing/everthing-hook/raw/master/src/everything-hook.js
// @version      0.5.9056
// @include      *
// @description  It can hook everything (timers, AJAX, methods, etc.)
// @author       Cangshi
// @match        http://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function webpackUniversalModuleDefinition(root, factory) {
    if (typeof exports === 'object' && typeof module === 'object')
        module.exports = factory();
    else if (typeof define === 'function' && define.amd)
        define([], factory);
    else {
        var a = factory();
        for (var i in a) (typeof exports === 'object' ? exports : root)[i] = a[i];
    }
})(typeof self !== 'undefined' ? self : this, function() {
    return (function() {
        var __webpack_modules__ = [
            function(module, __unused_webpack_exports, __webpack_require__) {
                "use strict";

                const eUtils = __webpack_require__(1);

                (function(global, factory) {
                    "use strict";
                    if (typeof module !== "undefined" && module.exports) {
                        var results = factory.bind(global)(global, eUtils, true) || [];
                        var HookJS = {};
                        results.forEach(function(part) {
                            HookJS[part.name] = part.module;
                        });
                        module.exports = HookJS;
                    } else {
                        factory.bind(global)(global, eUtils);
                    }
                }(typeof window !== "undefined" ? window : this, function(_global, utils, noGlobal) {

                    var EHook = function() {
                        var _autoId = 1;
                        var _hookedMap = {};
                        var _hookedContextMap = {};
                        this._getHookedMap = function() { return _hookedMap; };
                        this._getHookedContextMap = function() { return _hookedContextMap; };
                        this._getAutoStrId = function() { return '__auto__' + _autoId++; };
                        this._getAutoId = function() { return _autoId++; };
                    };

                    EHook.prototype = {
                        _getHookedId: function(context) {
                            var contextMap = this._getHookedContextMap();
                            var hookedId = null;
                            Object.keys(contextMap).forEach(key => {
                                if (context === contextMap[key]) hookedId = key;
                            });
                            if (hookedId == null) {
                                hookedId = this._getAutoStrId();
                                contextMap[hookedId] = context;
                            }
                            return hookedId;
                        },

                        _getHookedMethodMap: function(context) {
                            var hookedId = this._getHookedId(context);
                            var hookedMap = this._getHookedMap();
                            var thisTask = hookedMap[hookedId];
                            if (!utils.isExistObject(thisTask)) {
                                thisTask = hookedMap[hookedId] = {};
                            }
                            return thisTask;
                        },

                        _getHookedMethodTask: function(context, methodName) {
                            var thisMethodMap = this._getHookedMethodMap(context);
                            var thisMethod = thisMethodMap[methodName];
                            if (!utils.isExistObject(thisMethod)) {
                                thisMethod = thisMethodMap[methodName] = {
                                    original: undefined,
                                    replace: undefined,
                                    task: { before: [], current: undefined, after: [] }
                                };
                            }
                            return thisMethod;
                        },

                        _invokeMethods: function(context, methods, args) {
                            if (!utils.isArray(methods)) return;
                            var result = null;
                            utils.ergodicArrayObject(context, methods, function(_method) {
                                if (!utils.isFunction(_method.method)) return;
                                var r = _method.method.apply(context, args);
                                if (r != null) result = r;
                            });
                            return result;
                        },

                        _hook: function(parent, methodName, context) {
                            if (context === undefined) context = parent;
                            var method = parent[methodName];
                            var methodTask = this._getHookedMethodTask(parent, methodName);
                            if (!methodTask.original) methodTask.original = method;
                            if (utils.isExistObject(methodTask.replace) && utils.isFunction(methodTask.replace.method)) {
                                parent[methodName] = methodTask.replace.method(methodTask.original);
                                return;
                            }
                            var invokeMethods = this._invokeMethods;
                            var builder = new utils.FunctionBuilder(function(v) { return { result: undefined }; });
                            if (methodTask.task.before.length > 0) {
                                builder.push(function(v) {
                                    invokeMethods(context || v.this, methodTask.task.before, [methodTask.original, v.arguments]);
                                });
                            }
                            if (utils.isExistObject(methodTask.task.current) && utils.isFunction(methodTask.task.current.method)) {
                                builder.push(function(v) {
                                    return { result: methodTask.task.current.method.call(context || v.this, parent, methodTask.original, v.arguments) };
                                });
                            } else {
                                builder.push(function(v) {
                                    return { result: methodTask.original.apply(context || v.this, v.arguments) };
                                });
                            }
                            if (methodTask.task.after.length > 0) {
                                builder.push(function(v) {
                                    var args = [methodTask.original, v.arguments, v.result];
                                    var r = invokeMethods(context || v.this, methodTask.task.after, args);
                                    return { result: (r != null ? r : v.result) };
                                });
                            }
                            builder.push(function(v) { return { returnValue: v.result }; });
                            var resultFunc = builder.result();
                            for (var proxyName in methodTask.original) {
                                Object.defineProperty(resultFunc, proxyName, {
                                    get: function() { return methodTask.original[proxyName]; },
                                    set: function(v) { methodTask.original[proxyName] = v; }
                                });
                            }
                            resultFunc.prototype = methodTask.original.prototype;
                            parent[methodName] = resultFunc;
                        },

                        hook: function(parent, methodName, config) {
                            var hookedFailure = -1;
                            var context = config.context !== undefined ? config.context : parent;
                            if (parent[methodName] == null) parent[methodName] = function() {};
                            if (!utils.isFunction(parent[methodName])) return hookedFailure;
                            var methodTask = this._getHookedMethodTask(parent, methodName);
                            var id = this._getAutoId();
                            if (utils.isFunction(config.replace)) {
                                methodTask.replace = { id: id, method: config.replace };
                                hookedFailure = 0;
                            }
                            if (utils.isFunction(config.before)) {
                                methodTask.task.before.push({ id: id, method: config.before });
                                hookedFailure = 0;
                            }
                            if (utils.isFunction(config.current)) {
                                methodTask.task.current = { id: id, method: config.current };
                                hookedFailure = 0;
                            }
                            if (utils.isFunction(config.after)) {
                                methodTask.task.after.push({ id: id, method: config.after });
                                hookedFailure = 0;
                            }
                            if (hookedFailure === 0) {
                                this._hook(parent, methodName, context);
                                return id;
                            }
                            return hookedFailure;
                        },

                        hookReplace: function(parent, methodName, replace, context) {
                            return this.hook(parent, methodName, { replace: replace, context: context });
                        },

                        hookBefore: function(parent, methodName, before, context) {
                            return this.hook(parent, methodName, { before: before, context: context });
                        },

                        hookCurrent: function(parent, methodName, current, context) {
                            return this.hook(parent, methodName, { current: current, context: context });
                        },

                        hookAfter: function(parent, methodName, after, context) {
                            return this.hook(parent, methodName, { after: after, context: context });
                        },

                        hookClass: function(parent, className, replace, innerName, excludeProperties) {
                            var _this = this;
                            var originFunc = parent[className];
                            if (!excludeProperties) excludeProperties = [];
                            excludeProperties.push('prototype', 'caller', 'arguments');
                            innerName = innerName || '_innerHook';
                            var resFunc = function() {
                                this[innerName] = new originFunc();
                                replace.apply(this, arguments);
                            };
                            this.hookedToString(originFunc, resFunc);
                            this.hookedToProperties(originFunc, resFunc, true, excludeProperties);
                            var prototypeProperties = Object.getOwnPropertyNames(originFunc.prototype);
                            var prototype = resFunc.prototype = { constructor: resFunc };
                            prototypeProperties.forEach(function(name) {
                                if (name === 'constructor') return;
                                var method = function() {
                                    if (originFunc.prototype[name] && utils.isFunction(originFunc.prototype[name])) {
                                        return originFunc.prototype[name].apply(this[innerName], arguments);
                                    }
                                    return undefined;
                                };
                                _this.hookedToString(originFunc.prototype[name], method);
                                prototype[name] = method;
                            });
                            this.hookReplace(parent, className, function() { return resFunc; }, parent);
                        },

                        hookedToProperties: function(originObject, resultObject, isDefined, excludeProperties) {
                            var objectProperties = Object.getOwnPropertyNames(originObject);
                            objectProperties.forEach(function(property) {
                                if (utils.contains(excludeProperties, property)) return;
                                if (!isDefined) {
                                    resultObject[property] = originObject[property];
                                } else {
                                    Object.defineProperty(resultObject, property, {
                                        configurable: false, enumerable: false,
                                        value: originObject[property], writable: false
                                    });
                                }
                            });
                        },

                        hookedToString: function(originObject, resultObject) {
                            Object.defineProperties(resultObject, {
                                toString: {
                                    configurable: false, enumerable: false,
                                    value: originObject.toString.bind(originObject), writable: false
                                },
                                toLocaleString: {
                                    configurable: false, enumerable: false,
                                    value: originObject.toLocaleString.bind(originObject), writable: false
                                }
                            });
                        },

                        hookAjax: function(methods) {
                            if (this.isHooked(_global, 'XMLHttpRequest')) return;
                            var _this = this;
                            var hookMethod = function(methodName) {
                                if (utils.isFunction(methods[methodName]))
                                    _this.hookBefore(this.xhr, methodName, methods[methodName]);
                                return this.xhr[methodName].bind(this.xhr);
                            };
                            var getProperty = function(attr) {
                                return function() { return this.hasOwnProperty(attr + "_") ? this[attr + "_"] : this.xhr[attr]; };
                            };
                            var setProperty = function(attr) {
                                return function(f) {
                                    var xhr = this.xhr;
                                    var that = this;
                                    if (attr.indexOf("on") !== 0) {
                                        this[attr + "_"] = f;
                                        return;
                                    }
                                    if (methods[attr]) {
                                        xhr[attr] = function() { f.apply(xhr, arguments); };
                                        _this.hookBefore(xhr, attr, methods[attr]);
                                    } else {
                                        xhr[attr] = f;
                                    }
                                };
                            };
                            return this.hookReplace(_global, 'XMLHttpRequest', function(XMLHttpRequest) {
                                var resFunc = function() {
                                    this.xhr = new XMLHttpRequest();
                                    for (var propertyName in this.xhr) {
                                        var property = this.xhr[propertyName];
                                        if (utils.isFunction(property)) {
                                            this[propertyName] = hookMethod.bind(this)(propertyName);
                                        } else {
                                            Object.defineProperty(this, propertyName, {
                                                get: getProperty(propertyName),
                                                set: setProperty(propertyName)
                                            });
                                        }
                                    }
                                    this.xhr.xhr = this;
                                };
                                _this.hookedToProperties(XMLHttpRequest, resFunc, true);
                                _this.hookedToString(XMLHttpRequest, resFunc);
                                return resFunc;
                            });
                        },

                        hookAjaxV2: function(methods) {
                            this.hookClass(window, 'XMLHttpRequest', function() {});
                            utils.ergodicObject(this, methods, function(method) {});
                        },

                        unHook: function(context, methodName, isDeeply, eqId) {
                            if (!context[methodName] || !utils.isFunction(context[methodName])) return;
                            var methodTask = this._getHookedMethodTask(context, methodName);
                            if (eqId && this.unHookById(eqId)) return;
                            if (!methodTask.original) {
                                delete this._getHookedMethodMap(context)[methodName];
                                return;
                            }
                            context[methodName] = methodTask.original;
                            if (isDeeply) delete this._getHookedMethodMap(context)[methodName];
                        },

                        unHookById: function(eqId) {
                            var hasEq = false;
                            if (eqId) {
                                var hookedMap = this._getHookedMap();
                                utils.ergodicObject(this, hookedMap, function(contextMap) {
                                    utils.ergodicObject(this, contextMap, function(methodTask) {
                                        methodTask.task.before = methodTask.task.before.filter(function(before) {
                                            hasEq = hasEq || before.id === eqId;
                                            return before.id !== eqId;
                                        });
                                        methodTask.task.after = methodTask.task.after.filter(function(after) {
                                            hasEq = hasEq || after.id === eqId;
                                            return after.id !== eqId;
                                        });
                                        if (methodTask.task.current && methodTask.task.current.id === eqId) {
                                            methodTask.task.current = undefined;
                                            hasEq = true;
                                        }
                                        if (methodTask.replace && methodTask.replace.id === eqId) {
                                            methodTask.replace = undefined;
                                            hasEq = true;
                                        }
                                    });
                                });
                            }
                            return hasEq;
                        },

                        removeHookMethod: function(context, methodName) {
                            if (!context[methodName] || !utils.isFunction(context[methodName])) return;
                            this._getHookedMethodMap(context)[methodName] = {
                                original: undefined, replace: undefined,
                                task: { before: [], current: undefined, after: [] }
                            };
                        },

                        isHooked: function(context, methodName) {
                            var hookMap = this._getHookedMethodMap(context);
                            return hookMap[methodName] !== undefined && hookMap[methodName].original !== undefined;
                        },

                        protect: function(parent, methodName) {
                            Object.defineProperty(parent, methodName, { configurable: false, writable: false });
                        },

                        preventError: function(parent, methodName, returnValue, context) {
                            this.hookCurrent(parent, methodName, function(m, args) {
                                var value = returnValue;
                                try { value = m.apply(this, args); } catch(e) { console.log('Error prevented from method', methodName, e); }
                                return value;
                            }, context);
                        },

                        plugins: function(option) {
                            if (utils.isFunction(option.mount)) {
                                var result = option.mount.call(this, utils);
                                if (typeof option.name === 'string') _global[option.name] = result;
                            }
                        }
                    };

                    if (_global.eHook && (_global.eHook instanceof EHook)) return;
                    var eHook = new EHook();

                    var AHook = function() {
                        this.isHooked = false;
                        var autoId = 1;
                        this._urlDispatcherList = [];
                        this._getAutoId = function() { return autoId++; };
                    };

                    AHook.prototype = {
                        _invokeAimMethods: function(xhr, methodName, args) {
                            var configs = utils.parseArrayByProperty(xhr.patcherList, 'config');
                            var methods = [];
                            utils.ergodicArrayObject(xhr, configs, function(config) {
                                if (utils.isFunction(config[methodName])) methods.push(config[methodName]);
                            });
                            return utils.invokeMethods(xhr, methods, args);
                        },

                        _urlPatcher: function(url) {
                            var patcherList = [];
                            utils.ergodicArrayObject(this, this._urlDispatcherList, function(patcherMap) {
                                if (utils.UrlUtils.urlMatching(url, patcherMap.patcher)) patcherList.push(patcherMap);
                            });
                            return patcherList;
                        },

                        _xhrDispatcher: function(xhr, fullUrl) {
                            var url = utils.UrlUtils.getUrlWithoutParam(fullUrl);
                            xhr.patcherList = this._urlPatcher(url);
                        },

                        _parseEvent: function(e, xhr) {
                            try {
                                Object.defineProperties(e, {
                                    target: { get: function() { return xhr; } },
                                    srcElement: { get: function() { return xhr; } }
                                });
                            } catch(error) {
                                console.warn('Redefining return event failed, response interception may fail');
                            }
                            return e;
                        },

                        _parseOpenArgs: function(args) {
                            return {
                                method: args[0], fullUrl: args[1], url: utils.UrlUtils.getUrlWithoutParam(args[1]),
                                params: utils.UrlUtils.getParamFromUrl(args[1]), async: args[2]
                            };
                        },

                        _rebuildOpenArgs: function(argsObject, argsArray) {
                            argsArray[0] = argsObject.method;
                            argsArray[1] = utils.UrlUtils.margeUrlAndParams(argsObject.url, argsObject.params);
                            argsArray[2] = argsObject.async;
                        },

                        _getHookedArgs: function(args) {
                            return Array.prototype.slice.call(args, 0).splice(1);
                        },

                        _onResponse: function(outerXhr, funcArgs) {
                            var args = this._getHookedArgs(funcArgs);
                            args[0][0] = this._parseEvent(args[0][0], outerXhr.xhr);
                            var results = this._invokeAimMethods(outerXhr, 'hookResponse', args);
                            var resultIndex = -1;
                            utils.ergodicArrayObject(outerXhr, results, function(res, i) { if (res != null) resultIndex = i; });
                            if (resultIndex !== -1) outerXhr.xhr.responseText_ = outerXhr.xhr.response_ = results[resultIndex];
                        },

                        startHook: function() {
                            var _this = this;
                            var normalMethods = {
                                onreadystatechange: function() {
                                    if (this.readyState == 4 && (this.status == 200 || this.status == 304)) _this._onResponse(this, arguments);
                                },
                                onload: function() { _this._onResponse(this, arguments); },
                                open: function() {
                                    var args = _this._getHookedArgs(arguments);
                                    var fullUrl = args[0][1];
                                    _this._xhrDispatcher(this, fullUrl);
                                    var argsObject = _this._parseOpenArgs(args[0]);
                                    this.openArgs = argsObject;
                                    _this._invokeAimMethods(this, 'hookRequest', [argsObject]);
                                    _this._rebuildOpenArgs(argsObject, args[0]);
                                },
                                send: function() {
                                    var args = _this._getHookedArgs(arguments);
                                    this.sendArgs = args;
                                    _this._invokeAimMethods(this, 'hookSend', args);
                                }
                            };
                            this.___hookedId = _global.eHook.hookAjax(normalMethods);
                            this.isHooked = true;
                        },

                        register: function(urlPatcher, configOrRequest, response) {
                            if (!urlPatcher) return -1;
                            if (!utils.isExistObject(configOrRequest) && !utils.isFunction(response)) return -1;
                            var config = {};
                            if (utils.isFunction(configOrRequest)) config.hookRequest = configOrRequest;
                            if (utils.isFunction(response)) config.hookResponse = response;
                            if (utils.isExistObject(configOrRequest)) config = configOrRequest;
                            var id = this._getAutoId();
                            this._urlDispatcherList.push({ id: id, patcher: urlPatcher, config: config });
                            if (!this.isHooked) this.startHook();
                            return id;
                        }
                    };

                    _global['eHook'] = eHook;
                    _global['aHook'] = new AHook();

                    return [{ name: 'eHook', module: eHook }, { name: 'aHook', module: _global['aHook'] }];
                }));
            },
            function(module) {
                (function(global, factory) {
                    "use strict";
                    if (typeof module !== "undefined" && module.exports) {
                        module.exports = factory(global, true);
                    } else {
                        factory(global);
                    }
                }(typeof window !== "undefined" ? window : this, function(_global, noGlobal) {
                    var map = Array.prototype.map;
                    var forEach = Array.prototype.forEach;
                    var reduce = Array.prototype.reduce;

                    var BaseUtils = {
                        isArray: function(arr) { return Array.isArray(arr) || Object.prototype.toString.call(arr) === "[object Array]"; },
                        isFunction: function(func) { return func && typeof func === 'function'; },
                        isExistObject: function(obj) { return obj && (typeof obj === 'object'); },
                        isString: function(str) { return str !== null && typeof str === 'string'; },
                        uniqueNum: 1000,
                        buildUniqueId: function() {
                            var prefix = new Date().getTime().toString();
                            var suffix = this.uniqueNum.toString();
                            this.uniqueNum++;
                            return prefix + suffix;
                        }
                    };

                    var serviceProvider = {
                        _parseDepends: function(depends) {
                            var dependsArr = [];
                            if (!BaseUtils.isArray(depends)) return;
                            forEach.call(depends, function(depend) {
                                if (BaseUtils.isString(depend)) dependsArr.push(serviceProvider[depend.toLowerCase()]);
                            });
                            return dependsArr;
                        }
                    };

                    var factory = function(name, depends, construction) {
                        if (!BaseUtils.isFunction(construction)) return;
                        serviceProvider[name.toLowerCase()] = construction.apply(this, serviceProvider._parseDepends(depends));
                    };

                    var depend = function(depends, construction) {
                        if (!BaseUtils.isFunction(construction)) return;
                        construction.apply(this, serviceProvider._parseDepends(depends));
                    };

                    factory('BaseUtils', [], function() { return BaseUtils; });
                    factory('logger', [], function() { return console; });

                    factory('DateTimeUtils', ['logger'], function(logger) {
                        return {
                            printNowTime: function() { var date = new Date(); console.log(this.pattern(date, 'hh:mm:ss:S')); },
                            pattern: function(date, fmt) {
                                var o = {
                                    "M+": date.getMonth() + 1, "d+": date.getDate(),
                                    "h+": date.getHours() % 12 === 0 ? 12 : date.getHours() % 12,
                                    "H+": date.getHours(), "m+": date.getMinutes(),
                                    "s+": date.getSeconds(), "q+": Math.floor((date.getMonth() + 3) / 3),
                                    "S": date.getMilliseconds()
                                };
                                var week = { "0": "Sun", "1": "Mon", "2": "Tue", "3": "Wed", "4": "Thu", "5": "Fri", "6": "Sat" };
                                if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (date.getFullYear() + "").substr(4 - RegExp.$1.length));
                                if (/(E+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, ((RegExp.$1.length > 1) ? (RegExp.$1.length > 2 ? "Week" : "Day") : "") + week[date.getDay() + ""]);
                                for (var k in o) {
                                    if (new RegExp("(" + k + ")").test(fmt))
                                        fmt = fmt.replace(RegExp.$1, (RegExp.$1.length === 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
                                }
                                return fmt;
                            },
                            getCurrentId: function() { return new Date().getTime(); },
                            getNowBetweenADay: function(date, isCeil, type) {
                                if (!type) type = 'day';
                                if (typeof date === 'number') date = new Date(date);
                                if (!(date instanceof Date)) throw new TypeError('Parameter must be a Date');
                                var time = date.getTime();
                                var now = new Date();
                                var nowTime = now.getTime();
                                if (nowTime - time < 0) logger.warn('The given date must be earlier than current time');
                                var result = 0;
                                switch (type) {
                                    case 'day': result = (nowTime - time) / (1000 * 60 * 60 * 24); break;
                                    case 'month': result = (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth()); break;
                                    case 'year': result = now.getFullYear() - date.getFullYear(); break;
                                }
                                return isCeil ? Math.ceil(result) : Math.floor(result);
                            }
                        };
                    });

                    factory('ArrayUtils', ['BaseUtils'], function(BaseUtils) {
                        return {
                            isArrayObject: function(arr) { return BaseUtils.isArray(arr); },
                            ergodicArrayObject: function(context, arr, cb) {
                                if (!context) context = _global;
                                if (!BaseUtils.isArray(arr) || !BaseUtils.isFunction(cb)) return;
                                for (var i = 0; i < arr.length; i++) {
                                    if (cb.call(context, arr[i], i) === -1) break;
                                }
                            },
                            getPropertyDo: function(context, arr, propertyName, cb, checkProperty) {
                                if (checkProperty === null) checkProperty = true;
                                this.ergodicArrayObject(context, arr, function(ele) {
                                    if (!checkProperty || ele.hasOwnProperty(propertyName)) cb.call(context, ele[propertyName], ele);
                                });
                            },
                            parseKeyValue: function(arr) {
                                var map = {};
                                if (!BaseUtils.isArray(arr)) return map;
                                this.ergodicArrayObject(this, arr, function(ele) {
                                    if (ele.key && !map.hasOwnProperty(ele.key)) map[ele.key] = ele.value;
                                });
                                return map;
                            },
                            getHashCode: function(arr) {
                                var str = arr.toString();
                                var hash = 31;
                                if (str.length === 0) return hash;
                                for (var i = 0; i < str.length; i++) {
                                    var char = str.charCodeAt(i);
                                    hash = ((hash << 5) - hash) + char;
                                    hash = hash & hash;
                                }
                                return hash;
                            },
                            parseArrayByProperty: function(arr, propertyName) {
                                var result = [];
                                if (!this.isArrayObject(arr)) return result;
                                this.getPropertyDo(this, arr, propertyName, function(value) { result.push(value); }, true);
                                return result;
                            },
                            isContainsObject: function(arr, obj, cb) {
                                var isContains = false;
                                this.ergodicArrayObject(this, arr, function(value, i) {
                                    if (obj === value) {
                                        isContains = true;
                                        if (BaseUtils.isFunction(cb)) cb.call(_global, i);
                                        return -1;
                                    }
                                });
                                return isContains;
                            },
                            getMaxInArray: function(arr, cb) {
                                var maxObject = null;
                                var maxIndex = -1;
                                while (maxObject === null && maxIndex < arr.length) maxObject = arr[++maxIndex];
                                for (var i = maxIndex + 1; i < arr.length; i++) {
                                    if (maxObject !== null && this.isArrayObject(maxObject) && this.isArrayObject(arr[i])) {
                                        var classLength = maxObject.length;
                                        var classLevel = 0;
                                        while (maxObject[classLevel] === arr[i][classLevel] && classLevel < classLength) classLevel++;
                                        if (maxObject[classLevel] !== null && maxObject[classLevel] < arr[i][classLevel]) {
                                            maxObject = arr[i];
                                            maxIndex = i;
                                        }
                                        continue;
                                    }
                                    if (maxObject !== null && maxObject < arr[i]) { maxObject = arr[i]; maxIndex = i; }
                                }
                                if (BaseUtils.isFunction(cb)) cb.call(this, maxObject, maxIndex);
                                return maxObject;
                            },
                            getSumInArray: function(arr, cb) {
                                if (!this.isArrayObject(arr)) return;
                                var sum = 0, count = 0;
                                this.ergodicArrayObject(this, arr, function(value) {
                                    if (typeof value === 'number' && !Number.isNaN(value)) { sum += value; count++; }
                                });
                                if (BaseUtils.isFunction(cb)) cb.call(_global, sum, count);
                                return sum;
                            },
                            getAverageInArray: function(arr) {
                                var average = 0;
                                this.getSumInArray(arr, function(sum, i) { if (i !== 0) average = sum / i; });
                                return average;
                            },
                            sortingArrays: function(arr, order, sortSetting) {
                                if (!this.isArrayObject(arr)) return;
                                var DESC = 0, ASC = 1;
                                var thisArr = arr.slice(0);
                                var _thisAction = null;
                                if (sortSetting && sortSetting.getComparedProperty && BaseUtils.isFunction(sortSetting.getComparedProperty))
                                    thisArr = sortSetting.getComparedProperty(arr);
                                switch (order) {
                                    case DESC: _thisAction = thisArr.push; break;
                                    case ASC: _thisAction = thisArr.unshift; break;
                                    default: _thisAction = thisArr.push; break;
                                }
                                var resultArr = [];
                                for (var j = 0; j < thisArr.length; j++) {
                                    this.getMaxInArray(thisArr, function(max, i) {
                                        delete thisArr[i];
                                        _thisAction.call(resultArr, arr[i]);
                                    });
                                }
                                if (sortSetting && sortSetting.createNewData) return resultArr.slice(0);
                                return resultArr;
                            },
                            toArray: function(arrLike) {
                                if (!arrLike || arrLike.length === 0) return [];
                                if (!arrLike.length) return arrLike;
                                try { return [].slice.call(arrLike); } catch(e) {
                                    var i = 0, j = arrLike.length, res = [];
                                    for (; i < j; i++) res.push(arrLike[i]);
                                    return res;
                                }
                            },
                            isArrayLick: function(o) {
                                return o && typeof o === 'object' && isFinite(o.length) && o.length >= 0 && o.length === Math.floor(o.length) && o.length < 4294967296;
                            },
                            contains: function(arr, obj) {
                                var contains = false;
                                this.ergodicArrayObject(this, arr, function(a) { if (a === obj) { contains = true; return -1; } });
                                return contains;
                            }
                        };
                    });

                    factory('ObjectUtils', ['ArrayUtils', 'BaseUtils'], function(ArrayUtils, BaseUtils) {
                        return {
                            readLinkProperty: function(obj, linkProperty, cb) {
                                var callback = BaseUtils.isFunction(cb) ? cb : null;
                                if (typeof linkProperty === 'string') {
                                    linkProperty = linkProperty.replace(/ /g, '');
                                    if (linkProperty === '') return null;
                                    if (linkProperty.indexOf(',') !== -1) {
                                        var propertyNameArr = linkProperty.split(',');
                                        return this.readLinkProperty(obj, propertyNameArr, callback);
                                    }
                                    if (linkProperty.indexOf('.') !== -1) {
                                        var names = linkProperty.split('.');
                                        var iterationObj = obj;
                                        var result = null;
                                        ArrayUtils.ergodicArrayObject(this, names, function(name, i) {
                                            iterationObj = this.readLinkProperty(iterationObj, name);
                                            if (names[names.length - 1] === name && names.length - 1 === i) {
                                                result = iterationObj;
                                                if (callback) callback.call(_global, result, linkProperty);
                                            }
                                            if (typeof iterationObj === 'undefined') return -1;
                                        });
                                        return result;
                                    }
                                    var normalResult = null;
                                    if (linkProperty.slice(linkProperty.length - 2) === '()') {
                                        var func = linkProperty.slice(0, linkProperty.length - 2);
                                        normalResult = obj[func]();
                                    } else {
                                        normalResult = obj[linkProperty];
                                    }
                                    if (normalResult === null) console.warn(obj, 'property [' + linkProperty + '] not found');
                                    if (callback) callback.call(_global, normalResult, linkProperty);
                                    return normalResult;
                                }
                                if (BaseUtils.isArray(linkProperty)) {
                                    var results = [];
                                    ArrayUtils.ergodicArrayObject(this, linkProperty, function(name) {
                                        var value = this.readLinkProperty(obj, name);
                                        results.push(value);
                                        if (callback && name !== '') return callback.call(_global, value, name);
                                    });
                                    results.isMultipleResults = true;
                                    return results;
                                }
                            },
                            createLinkProperty: function(obj, linkProperty, value) {
                                if (obj === null) obj = {};
                                if (typeof linkProperty === 'string') {
                                    linkProperty = linkProperty.replace(/ /g, '');
                                    if (linkProperty === '') throw new TypeError('Property name cannot be empty');
                                    if (linkProperty.indexOf(',') !== -1) {
                                        var propertyNameArr = linkProperty.split(',');
                                        this.createLinkProperty(obj, propertyNameArr, value);
                                        return obj;
                                    }
                                    if (linkProperty.indexOf('.') !== -1) {
                                        var names = linkProperty.split('.');
                                        if (!obj.hasOwnProperty(names[0])) obj[names[0]] = {};
                                        if (!Number.isNaN(parseInt(names[0]))) { if (!ArrayUtils.isArrayObject(obj)) obj = []; }
                                        var propertyObj = obj[names[0]];
                                        var newProperties = names.slice(1, names.length);
                                        var newLinkProperty = '';
                                        ArrayUtils.ergodicArrayObject(this, newProperties, function(property, i) {
                                            if (i < newProperties.length - 1) newLinkProperty = newLinkProperty + property + '.';
                                            else newLinkProperty = newLinkProperty + property;
                                        });
                                        obj[names[0]] = this.createLinkProperty(propertyObj, newLinkProperty, value);
                                        return obj;
                                    }
                                    if (!Number.isNaN(parseInt(linkProperty))) { if (!ArrayUtils.isArrayObject(obj)) obj = []; }
                                    obj[linkProperty] = value;
                                    return obj;
                                } else if (BaseUtils.isArray(linkProperty)) {
                                    ArrayUtils.ergodicArrayObject(this, linkProperty, function(link) { obj = this.createLinkProperty(obj, link, value); });
                                    return obj;
                                }
                            },
                            ergodicObject: function(context, obj, cb, isReadInnerObject) {
                                var keys = Object.keys(obj);
                                ArrayUtils.ergodicArrayObject(this, keys, function(propertyName) {
                                    if (isReadInnerObject && obj[propertyName] !== null && typeof obj[propertyName] === 'object') {
                                        this.ergodicObject(this, obj[propertyName], function(value, key) { return cb.call(context, value, propertyName + '.' + key); }, true);
                                    } else {
                                        return cb.call(context, obj[propertyName], propertyName);
                                    }
                                });
                            },
                            whileEmptyObjectProperty: function(context, obj, propertyNames, cb) {
                                if (typeof propertyNames === 'string') {
                                    propertyNames = propertyNames.replace(/ /g, '');
                                    if (propertyNames === '') return;
                                    if (propertyNames.indexOf(',') !== -1) {
                                        var propertyNameArr = propertyNames.split(',');
                                        return this.whileEmptyObjectProperty(context, obj, propertyNameArr, cb);
                                    }
                                    if (propertyNames.indexOf('.') !== -1) {
                                        var names = propertyNames.split('.');
                                        var iterationObj = obj;
                                        var result = null;
                                        ArrayUtils.ergodicArrayObject(this, names, function(name) {
                                            if (iterationObj && iterationObj.hasOwnProperty(name)) iterationObj = iterationObj[name];
                                            else { result = cb.call(_global, propertyNames); return -1; }
                                        });
                                        return result;
                                    }
                                    if (!obj.hasOwnProperty(propertyNames) || obj[propertyNames] === null || obj[propertyNames] === '')
                                        return cb.call(context, propertyNames);
                                } else if (BaseUtils.isArray(propertyNames)) {
                                    var _this = this;
                                    ArrayUtils.ergodicArrayObject(this, propertyNames, function(propertyName) { return _this.whileEmptyObjectProperty(context, obj, propertyName, cb); });
                                }
                            },
                            whileEmptyObjectPropertyV2: function(context, obj, propertyNames, cb) {
                                this.readLinkProperty(obj, propertyNames, function(value, propertyName) {
                                    if (value === null || value === '' || parseInt(value) < 0) return cb.call(context, propertyName);
                                });
                            },
                            cloneObject: function(obj) {
                                var newObj = {};
                                if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'undefined' || typeof obj === 'function' || typeof obj === 'boolean')
                                    return obj;
                                if (BaseUtils.isArray(obj)) {
                                    newObj = [];
                                    ArrayUtils.ergodicArrayObject(this, obj, function(arrObjValue) { newObj.push(this.cloneObject(arrObjValue)); });
                                } else if (typeof obj === 'object') {
                                    if (obj === null) return null;
                                    this.ergodicObject(this, obj, function(value, key) { newObj[key] = this.cloneObject(value); });
                                }
                                return newObj;
                            },
                            getObjHashCode: function(obj) {
                                var str = JSON.stringify(obj);
                                var hash = 0, i, chr, len;
                                if (str.length === 0) return hash;
                                for (i = 0, len = str.length; i < len; i++) {
                                    chr = str.charCodeAt(i);
                                    hash = ((hash << 5) - hash) + chr;
                                    hash |= 0;
                                }
                                return hash;
                            },
                            expandObject: function(obj, extendedObj, isCover, isClone) {
                                var resultObj = obj;
                                if (isClone) resultObj = this.cloneObject(obj);
                                this.ergodicObject(this, extendedObj, function(value, key) {
                                    if (isCover && this.readLinkProperty(resultObj, key) !== null) return;
                                    resultObj = this.createLinkProperty(resultObj, key, value);
                                }, true);
                                return resultObj;
                            },
                            sortingArrayByProperty: function(arr, propertyName, order) {
                                var _this = this;
                                var sortSetting = {
                                    createNewData: false,
                                    getComparedProperty: function(arr) {
                                        var compareArr = [];
                                        ArrayUtils.ergodicArrayObject(_this, arr, function(obj, i) {
                                            if (typeof obj !== 'object') compareArr.push(obj);
                                            else {
                                                var compareValue = this.readLinkProperty(obj, propertyName);
                                                compareArr.push(compareValue !== null ? compareValue : obj);
                                            }
                                        });
                                        return compareArr.slice(0);
                                    }
                                };
                                return ArrayUtils.sortingArrays(arr, order, sortSetting);
                            },
                            toAimObject: function(obj, constructor, defaultProperty) {
                                if (BaseUtils.isArray(obj)) {
                                    var originArr = [];
                                    ArrayUtils.ergodicArrayObject(this, obj, function(value) { originArr.push(this.toAimObject(value, constructor, defaultProperty)); });
                                    return originArr;
                                } else if (typeof obj === 'object') {
                                    if (defaultProperty) {
                                        this.ergodicObject(this, defaultProperty, function(value, key) { if (obj[key] === null) obj[key] = value; });
                                    }
                                    if (obj instanceof constructor) return obj;
                                    var originObj = obj;
                                    while (originObj.__proto__ !== null && originObj.__proto__ !== Object.prototype) originObj = originObj.__proto__;
                                    originObj.__proto__ = constructor.prototype;
                                    return originObj;
                                }
                            },
                            parseTheSameObjectPropertyInArray: function(arr, propertyNames) {
                                var result = {};
                                var temp = {};
                                ArrayUtils.ergodicArrayObject(this, arr, function(obj) {
                                    this.readLinkProperty(obj, propertyNames, function(value, property) {
                                        if (!temp.hasOwnProperty(property) || !BaseUtils.isArray(temp[property])) temp[property] = [];
                                        temp[property].push(value);
                                    });
                                });
                                this.ergodicObject(this, temp, function(value, key) { result = this.createLinkProperty(result, key, value); });
                                return this.cloneObject(result);
                            },
                            parseTheSameObjectAllPropertyInArray: function(arr) {
                                if (!ArrayUtils.isArrayObject(arr) || arr.length < 1) return;
                                var propertyNames = [];
                                this.ergodicObject(this, arr[0], function(v, k) { propertyNames.push(k); }, true);
                                return this.parseTheSameObjectPropertyInArray(arr, propertyNames);
                            },
                            getCalculationInArrayByLinkPropertyNames: function(obj, propertyNames, type) {
                                var resultObject = {};
                                var _this = this;
                                switch (type) {
                                    case 'sum':
                                        this.readLinkProperty(obj, propertyNames, function(value, key) {
                                            if (ArrayUtils.isArrayObject(value)) resultObject = _this.createLinkProperty(resultObject, key, ArrayUtils.getSumInArray(value));
                                        });
                                        break;
                                    case 'average':
                                        this.readLinkProperty(obj, propertyNames, function(value, key) {
                                            if (ArrayUtils.isArrayObject(value)) resultObject = _this.createLinkProperty(resultObject, key, ArrayUtils.getAverageInArray(value));
                                        });
                                        break;
                                }
                                return resultObject;
                            }
                        };
                    });

                    factory('ColorUtils', [], function() {
                        return {
                            rgbToHex: function(r, g, b) {
                                var hex = ((r << 16) | (g << 8) | b).toString(16);
                                return "#" + new Array(Math.abs(hex.length - 7)).join("0") + hex;
                            },
                            hexToRgb: function(hex) {
                                hex = hex.replace(/ /g, '');
                                var length = hex.length;
                                var rgb = [];
                                switch (length) {
                                    case 4:
                                        rgb.push(parseInt(hex[1] + hex[1], 16));
                                        rgb.push(parseInt(hex[2] + hex[2], 16));
                                        rgb.push(parseInt(hex[3] + hex[3], 16));
                                        return rgb;
                                    case 7:
                                        for (var i = 1; i < 7; i += 2) rgb.push(parseInt("0x" + hex.slice(i, i + 2)));
                                        return rgb;
                                    default: break;
                                }
                            },
                            gradientColorsPercentage: function(start, end, percentage) {
                                var resultRgb = [];
                                var startRgb = this.hexToRgb(start);
                                if (end == null) return start;
                                var endRgb = this.hexToRgb(end);
                                var totalR = endRgb[0] - startRgb[0];
                                var totalG = endRgb[1] - startRgb[1];
                                var totalB = endRgb[2] - startRgb[2];
                                resultRgb.push(startRgb[0] + totalR * percentage);
                                resultRgb.push(startRgb[1] + totalG * percentage);
                                resultRgb.push(startRgb[2] + totalB * percentage);
                                return this.rgbToHex(resultRgb[0], resultRgb[1], resultRgb[2]);
                            }
                        };
                    });

                    factory('FunctionUtils', [], function() {
                        return {
                            getFunctionName: function(func) {
                                if (typeof func === 'function' || typeof func === 'object') {
                                    var name = ('' + func).match(/function\s*([\w\$]*)\s*\(/);
                                    return func.name || (name ? name[1] : '');
                                }
                            },
                            getFunctionParams: function(func) {
                                if (typeof func === 'function' || typeof func === 'object') {
                                    var name = ('' + func).match(/function.*\(([^)]*)\)/);
                                    return name ? name[1].replace(/( )|(\n)/g, '').split(',') : [];
                                }
                            },
                            getCallerName: function(func_arguments) {
                                var caller = func_arguments.callee.caller;
                                return caller ? this.getFunctionName(caller) : '';
                            },
                            FunctionBuilder: function(func) {
                                var _this = this;
                                var fs = [func];
                                var properties = ['push', 'unshift', 'slice', 'map', 'forEach', 'keys', 'find', 'concat', 'fill', 'shift', 'values'];
                                map.call(properties, function(property) {
                                    if (typeof Array.prototype[property] === 'function') {
                                        Object.defineProperty(_this, property, {
                                            get: function() { return function() { fs[property].apply(fs, arguments); return this; }; }
                                        });
                                    }
                                });
                                this.result = function(context) {
                                    var rfs = [];
                                    map.call(fs, function(f) { if (typeof f === 'function') rfs.push(f); });
                                    return function() {
                                        var declareVar = { arguments: arguments, this: this };
                                        map.call(rfs, function(f) {
                                            var dv = f.apply(context || this, [declareVar]);
                                            if (dv) map.call(Object.keys(dv), function(key) { declareVar[key] = dv[key]; });
                                        });
                                        return declareVar.returnValue;
                                    };
                                };
                            },
                            invokeMethods: function(context, methods, args) {
                                if (!this.isArray(methods)) return;
                                var results = [];
                                var _this = this;
                                this.ergodicArrayObject(context, methods, function(method) {
                                    if (!_this.isFunction(method)) return;
                                    results.push(method.apply(context, args));
                                });
                                return results;
                            }
                        };
                    });

                    factory('UrlUtils', [], function() {
                        return {
                            urlMatching: function(url, matchUrl) { return new RegExp(matchUrl).test(url); },
                            getUrlWithoutParam: function(url) { return url.split('?')[0]; },
                            getParamFromUrl: function(url) {
                                var params = [];
                                var parts = url.split('?');
                                if (parts.length < 2) return params;
                                var paramsStr = parts[1].split('&');
                                for (var i = 0; i < paramsStr.length; i++) {
                                    var index = paramsStr[i].indexOf('=');
                                    var ps = new Array(2);
                                    if (index !== -1) { ps = [paramsStr[i].substring(0, index), paramsStr[i].substring(index + 1)]; }
                                    else { ps[0] = paramsStr[i]; }
                                    params.push({ key: ps[0], value: ps[1] });
                                }
                                return params;
                            },
                            margeUrlAndParams: function(url, params) {
                                if (url.indexOf('?') !== -1 || !(params instanceof Array)) return url;
                                var paramsStr = [];
                                for (var i = 0; i < params.length; i++) {
                                    if (params[i].key !== null && params[i].value !== null)
                                        paramsStr.push(params[i].key + '=' + params[i].value);
                                }
                                return url + '?' + paramsStr.join('&');
                            }
                        };
                    });

                    factory('PointUtils', [], function() {
                        var Point2D = function(x, y) { this.x = x || 0; this.y = y || 0; };
                        Point2D.prototype = {
                            constructor: Point2D,
                            getOtherPointFromDistanceAndDeg: function(distance, deg) {
                                var radian = Math.PI / 180 * deg;
                                var point = new this.constructor();
                                point.x = distance * Math.sin(radian) + this.x;
                                point.y = this.y - distance * Math.cos(radian);
                                return point;
                            },
                            getDistanceFromAnotherPoint: function(p) { return Math.sqrt((this.x - p.x) * (this.x - p.x) + (this.y - p.y) * (this.y - p.y)); },
                            getDegFromAnotherPoint: function(p) {
                                var usedPoint = new Point2D(p.x * 1000000 - this.x * 1000000, p.y * 1000000 - this.y * 1000000);
                                var radian = Math.atan2(usedPoint.x * 1000000, usedPoint.y * 1000000);
                                var deg = radian * 180 / Math.PI;
                                return 180 - deg;
                            },
                            isInRect: function(x, y, width, height) {
                                var px = this.x, py = this.y;
                                return !(px < x || px > x + width) && !(py < y || py > y + height);
                            }
                        };
                        return { Point2D: Point2D };
                    });

                    _global.everyUtils = function() {
                        if (BaseUtils.isArray(arguments[0])) {
                            depend.call(arguments[2] || this, arguments[0], arguments[1]);
                        } else if (BaseUtils.isFunction(arguments[0])) {
                            var args = arguments;
                            depend.call(arguments[1] || this, ['FunctionUtils'], function(FunctionUtils) {
                                var depends = FunctionUtils.getFunctionParams(args[0]);
                                depend(depends, args[0]);
                            });
                        }
                    };

                    _global.eUtils = (function() {
                        var utils = {};
                        if (_global.everyUtils) {
                            _global.everyUtils(['ArrayUtils', 'ObjectUtils', 'BaseUtils', 'FunctionUtils', 'ColorUtils', 'PointUtils', 'UrlUtils'],
                                function(ArrayUtils, ObjectUtils, BaseUtils, FunctionUtils, ColorUtils, PointUtils, UrlUtils) {
                                    utils = {
                                        ArrayUtils: ArrayUtils, ObjectUtils: ObjectUtils, BaseUtils: BaseUtils,
                                        ColorUtils: ColorUtils, UrlUtils: UrlUtils, urlUtils: UrlUtils,
                                        PointUtils: PointUtils, FunctionUtils: FunctionUtils
                                    };
                                });
                        }
                        var proxy = {};
                        forEach.call(Object.keys(utils), function(utilName) {
                            if (!utilName) return;
                            Object.defineProperty(proxy, utilName, { get: function() { return utils[utilName]; } });
                            forEach.call(Object.keys(utils[utilName]), function(key) {
                                if (!key || proxy[key]) return;
                                Object.defineProperty(proxy, key, { get: function() { return utils[utilName][key]; } });
                            });
                        });
                        return proxy;
                    })();

                    return _global.eUtils;
                }));
            }
        ];

        var __webpack_module_cache__ = {};
        function __webpack_require__(moduleId) {
            if (__webpack_module_cache__[moduleId]) return __webpack_module_cache__[moduleId].exports;
            var module = __webpack_module_cache__[moduleId] = { exports: {} };
            __webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
            return module.exports;
        }
        return __webpack_require__(0);
    })();
});
