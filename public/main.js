"use strict";
(() => {
  // node_modules/@better-fetch/fetch/dist/index.js
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b2) => {
    for (var prop in b2 || (b2 = {}))
      if (__hasOwnProp.call(b2, prop))
        __defNormalProp(a, prop, b2[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b2)) {
        if (__propIsEnum.call(b2, prop))
          __defNormalProp(a, prop, b2[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b2) => __defProps(a, __getOwnPropDescs(b2));
  var BetterFetchError = class extends Error {
    constructor(status, statusText, error) {
      super(statusText || status.toString(), {
        cause: error
      });
      this.status = status;
      this.statusText = statusText;
      this.error = error;
    }
  };
  var initializePlugins = async (url, options) => {
    var _a, _b, _c, _d, _e2, _f;
    let opts = options || {};
    const hooks = {
      onRequest: [options == null ? void 0 : options.onRequest],
      onResponse: [options == null ? void 0 : options.onResponse],
      onSuccess: [options == null ? void 0 : options.onSuccess],
      onError: [options == null ? void 0 : options.onError],
      onRetry: [options == null ? void 0 : options.onRetry]
    };
    if (!options || !(options == null ? void 0 : options.plugins)) {
      return {
        url,
        options: opts,
        hooks
      };
    }
    for (const plugin of (options == null ? void 0 : options.plugins) || []) {
      if (plugin.init) {
        const pluginRes = await ((_a = plugin.init) == null ? void 0 : _a.call(plugin, url.toString(), options));
        opts = pluginRes.options || opts;
        url = pluginRes.url;
      }
      hooks.onRequest.push((_b = plugin.hooks) == null ? void 0 : _b.onRequest);
      hooks.onResponse.push((_c = plugin.hooks) == null ? void 0 : _c.onResponse);
      hooks.onSuccess.push((_d = plugin.hooks) == null ? void 0 : _d.onSuccess);
      hooks.onError.push((_e2 = plugin.hooks) == null ? void 0 : _e2.onError);
      hooks.onRetry.push((_f = plugin.hooks) == null ? void 0 : _f.onRetry);
    }
    return {
      url,
      options: opts,
      hooks
    };
  };
  var LinearRetryStrategy = class {
    constructor(options) {
      this.options = options;
    }
    shouldAttemptRetry(attempt, response) {
      if (this.options.shouldRetry) {
        return Promise.resolve(
          attempt < this.options.attempts && this.options.shouldRetry(response)
        );
      }
      return Promise.resolve(attempt < this.options.attempts);
    }
    getDelay() {
      return this.options.delay;
    }
  };
  var ExponentialRetryStrategy = class {
    constructor(options) {
      this.options = options;
    }
    shouldAttemptRetry(attempt, response) {
      if (this.options.shouldRetry) {
        return Promise.resolve(
          attempt < this.options.attempts && this.options.shouldRetry(response)
        );
      }
      return Promise.resolve(attempt < this.options.attempts);
    }
    getDelay(attempt) {
      const delay = Math.min(
        this.options.maxDelay,
        this.options.baseDelay * 2 ** attempt
      );
      return delay;
    }
  };
  function createRetryStrategy(options) {
    if (typeof options === "number") {
      return new LinearRetryStrategy({
        type: "linear",
        attempts: options,
        delay: 1e3
      });
    }
    switch (options.type) {
      case "linear":
        return new LinearRetryStrategy(options);
      case "exponential":
        return new ExponentialRetryStrategy(options);
      default:
        throw new Error("Invalid retry strategy");
    }
  }
  var getAuthHeader = (options) => {
    const headers = {};
    const getValue = (value) => typeof value === "function" ? value() : value;
    if (options == null ? void 0 : options.auth) {
      if (options.auth.type === "Bearer") {
        const token = getValue(options.auth.token);
        if (!token) {
          return headers;
        }
        headers["authorization"] = `Bearer ${token}`;
      } else if (options.auth.type === "Basic") {
        const username = getValue(options.auth.username);
        const password = getValue(options.auth.password);
        if (!username || !password) {
          return headers;
        }
        headers["authorization"] = `Basic ${btoa(`${username}:${password}`)}`;
      } else if (options.auth.type === "Custom") {
        const value = getValue(options.auth.value);
        if (!value) {
          return headers;
        }
        headers["authorization"] = `${getValue(options.auth.prefix)} ${value}`;
      }
    }
    return headers;
  };
  var methods = ["get", "post", "put", "patch", "delete"];
  var applySchemaPlugin = (config) => ({
    id: "apply-schema",
    name: "Apply Schema",
    version: "1.0.0",
    async init(url, options) {
      var _a, _b, _c, _d;
      const schema = ((_b = (_a = config.plugins) == null ? void 0 : _a.find(
        (plugin) => {
          var _a2;
          return ((_a2 = plugin.schema) == null ? void 0 : _a2.config) ? url.startsWith(plugin.schema.config.baseURL || "") || url.startsWith(plugin.schema.config.prefix || "") : false;
        }
      )) == null ? void 0 : _b.schema) || config.schema;
      if (schema) {
        let urlKey = url;
        if ((_c = schema.config) == null ? void 0 : _c.prefix) {
          if (urlKey.startsWith(schema.config.prefix)) {
            urlKey = urlKey.replace(schema.config.prefix, "");
            if (schema.config.baseURL) {
              url = url.replace(schema.config.prefix, schema.config.baseURL);
            }
          }
        }
        if ((_d = schema.config) == null ? void 0 : _d.baseURL) {
          if (urlKey.startsWith(schema.config.baseURL)) {
            urlKey = urlKey.replace(schema.config.baseURL, "");
          }
        }
        const keySchema = schema.schema[urlKey];
        if (keySchema) {
          let opts = __spreadProps(__spreadValues({}, options), {
            method: keySchema.method,
            output: keySchema.output
          });
          if (!(options == null ? void 0 : options.disableValidation)) {
            opts = __spreadProps(__spreadValues({}, opts), {
              body: keySchema.input ? keySchema.input.parse(options == null ? void 0 : options.body) : options == null ? void 0 : options.body,
              params: keySchema.params ? keySchema.params.parse(options == null ? void 0 : options.params) : options == null ? void 0 : options.params,
              query: keySchema.query ? keySchema.query.parse(options == null ? void 0 : options.query) : options == null ? void 0 : options.query
            });
          }
          return {
            url,
            options: opts
          };
        }
      }
      return {
        url,
        options
      };
    }
  });
  var createFetch = (config) => {
    async function $fetch(url, options) {
      const opts = __spreadProps(__spreadValues(__spreadValues({}, config), options), {
        plugins: [...(config == null ? void 0 : config.plugins) || [], applySchemaPlugin(config || {})]
      });
      if (config == null ? void 0 : config.catchAllError) {
        try {
          return await betterFetch(url, opts);
        } catch (error) {
          return {
            data: null,
            error: {
              status: 500,
              statusText: "Fetch Error",
              message: "Fetch related error. Captured by catchAllError option. See error property for more details.",
              error
            }
          };
        }
      }
      return await betterFetch(url, opts);
    }
    return $fetch;
  };
  var JSON_RE = /^application\/(?:[\w!#$%&*.^`~-]*\+)?json(;.+)?$/i;
  function detectResponseType(request) {
    const _contentType = request.headers.get("content-type");
    const textTypes = /* @__PURE__ */ new Set([
      "image/svg",
      "application/xml",
      "application/xhtml",
      "application/html"
    ]);
    if (!_contentType) {
      return "json";
    }
    const contentType = _contentType.split(";").shift() || "";
    if (JSON_RE.test(contentType)) {
      return "json";
    }
    if (textTypes.has(contentType) || contentType.startsWith("text/")) {
      return "text";
    }
    return "blob";
  }
  function isJSONParsable(value) {
    try {
      JSON.parse(value);
      return true;
    } catch (error) {
      return false;
    }
  }
  function isJSONSerializable(value) {
    if (value === void 0) {
      return false;
    }
    const t = typeof value;
    if (t === "string" || t === "number" || t === "boolean" || t === null) {
      return true;
    }
    if (t !== "object") {
      return false;
    }
    if (Array.isArray(value)) {
      return true;
    }
    if (value.buffer) {
      return false;
    }
    return value.constructor && value.constructor.name === "Object" || typeof value.toJSON === "function";
  }
  function jsonParse(text) {
    try {
      return JSON.parse(text);
    } catch (error) {
      return text;
    }
  }
  function isFunction(value) {
    return typeof value === "function";
  }
  function getFetch(options) {
    if (options == null ? void 0 : options.customFetchImpl) {
      return options.customFetchImpl;
    }
    if (typeof globalThis !== "undefined" && isFunction(globalThis.fetch)) {
      return globalThis.fetch;
    }
    if (typeof window !== "undefined" && isFunction(window.fetch)) {
      return window.fetch;
    }
    throw new Error("No fetch implementation found");
  }
  function getHeaders(opts) {
    const headers = new Headers(opts == null ? void 0 : opts.headers);
    const authHeader = getAuthHeader(opts);
    for (const [key, value] of Object.entries(authHeader || {})) {
      headers.set(key, value);
    }
    if (!headers.has("content-type")) {
      const t = detectContentType(opts == null ? void 0 : opts.body);
      if (t) {
        headers.set("content-type", t);
      }
    }
    return headers;
  }
  function detectContentType(body) {
    if (isJSONSerializable(body)) {
      return "application/json";
    }
    return null;
  }
  function getBody(options) {
    if (!(options == null ? void 0 : options.body)) {
      return null;
    }
    const headers = new Headers(options == null ? void 0 : options.headers);
    if (isJSONSerializable(options.body) && !headers.has("content-type")) {
      return JSON.stringify(options.body);
    }
    return options.body;
  }
  function getMethod(url, options) {
    var _a;
    if (options == null ? void 0 : options.method) {
      return options.method.toUpperCase();
    }
    if (url.startsWith("@")) {
      const pMethod = (_a = url.split("@")[1]) == null ? void 0 : _a.split("/")[0];
      if (!methods.includes(pMethod)) {
        return (options == null ? void 0 : options.body) ? "POST" : "GET";
      }
      return pMethod.toUpperCase();
    }
    return (options == null ? void 0 : options.body) ? "POST" : "GET";
  }
  function getTimeout(options, controller) {
    let abortTimeout;
    if (!(options == null ? void 0 : options.signal) && (options == null ? void 0 : options.timeout)) {
      abortTimeout = setTimeout(() => controller == null ? void 0 : controller.abort(), options == null ? void 0 : options.timeout);
    }
    return {
      abortTimeout,
      clearTimeout: () => {
        if (abortTimeout) {
          clearTimeout(abortTimeout);
        }
      }
    };
  }
  function getURL2(url, option) {
    let { baseURL, params, query } = option || {
      query: {},
      params: {},
      baseURL: ""
    };
    let basePath = url.startsWith("http") ? url.split("/").slice(0, 3).join("/") : baseURL;
    if (!basePath) {
      throw new TypeError(
        `Invalid URL ${url}. Are you passing in a relative URL but not setting the baseURL?`
      );
    }
    if (url.startsWith("@")) {
      const m2 = url.toString().split("@")[1].split("/")[0];
      if (methods.includes(m2)) {
        url = url.replace(`@${m2}/`, "/");
      }
    }
    if (!basePath.endsWith("/")) basePath += "/";
    let [path, urlQuery] = url.replace(basePath, "").split("?");
    const queryParams = new URLSearchParams(urlQuery);
    for (const [key, value] of Object.entries(query || {})) {
      queryParams.set(key, String(value));
    }
    if (params) {
      if (Array.isArray(params)) {
        const paramPaths = path.split("/").filter((p) => p.startsWith(":"));
        for (const [index, key] of paramPaths.entries()) {
          const value = params[index];
          path = path.replace(key, value);
        }
      } else {
        for (const [key, value] of Object.entries(params)) {
          path = path.replace(`:${key}`, String(value));
        }
      }
    }
    path = path.split("/").map(encodeURIComponent).join("/");
    if (path.startsWith("/")) path = path.slice(1);
    let queryParamString = queryParams.size > 0 ? `?${queryParams}`.replace(/\+/g, "%20") : "";
    const _url = new URL(`${path}${queryParamString}`, basePath);
    return _url;
  }
  var betterFetch = async (url, options) => {
    var _a, _b, _c, _d, _e2, _f, _g, _h;
    const {
      hooks,
      url: __url,
      options: opts
    } = await initializePlugins(url, options);
    const fetch = getFetch(opts);
    const controller = new AbortController();
    const signal = (_a = opts.signal) != null ? _a : controller.signal;
    const _url = getURL2(__url, opts);
    const body = getBody(opts);
    const headers = getHeaders(opts);
    const method = getMethod(__url, opts);
    let context = __spreadProps(__spreadValues({}, opts), {
      url: _url,
      headers,
      body,
      method,
      signal
    });
    for (const onRequest of hooks.onRequest) {
      if (onRequest) {
        const res = await onRequest(context);
        if (res instanceof Object) {
          context = res;
        }
      }
    }
    if ("pipeTo" in context && typeof context.pipeTo === "function" || typeof ((_b = options == null ? void 0 : options.body) == null ? void 0 : _b.pipe) === "function") {
      if (!("duplex" in context)) {
        context.duplex = "half";
      }
    }
    const { clearTimeout: clearTimeout2 } = getTimeout(opts, controller);
    let response = await fetch(context.url, context);
    clearTimeout2();
    const responseContext = {
      response,
      request: context
    };
    for (const onResponse of hooks.onResponse) {
      if (onResponse) {
        const r = await onResponse(__spreadProps(__spreadValues({}, responseContext), {
          response: ((_c = options == null ? void 0 : options.hookOptions) == null ? void 0 : _c.cloneResponse) ? response.clone() : response
        }));
        if (r instanceof Response) {
          response = r;
        } else if (r instanceof Object) {
          response = r.response;
        }
      }
    }
    if (response.ok) {
      const hasBody = context.method !== "HEAD";
      if (!hasBody) {
        return {
          data: "",
          error: null
        };
      }
      const responseType = detectResponseType(response);
      const successContext = {
        data: "",
        response,
        request: context
      };
      if (responseType === "json" || responseType === "text") {
        const text2 = await response.text();
        const parser2 = (_d = context.jsonParser) != null ? _d : jsonParse;
        const data = await parser2(text2);
        successContext.data = data;
      } else {
        successContext.data = await response[responseType]();
      }
      if (context == null ? void 0 : context.output) {
        if (context.output && !context.disableValidation) {
          successContext.data = context.output.parse(
            successContext.data
          );
        }
      }
      for (const onSuccess of hooks.onSuccess) {
        if (onSuccess) {
          await onSuccess(__spreadProps(__spreadValues({}, successContext), {
            response: ((_e2 = options == null ? void 0 : options.hookOptions) == null ? void 0 : _e2.cloneResponse) ? response.clone() : response
          }));
        }
      }
      if (options == null ? void 0 : options.throw) {
        return successContext.data;
      }
      return {
        data: successContext.data,
        error: null
      };
    }
    const parser = (_f = options == null ? void 0 : options.jsonParser) != null ? _f : jsonParse;
    const text = await response.text();
    const errorObject = isJSONParsable(text) ? await parser(text) : {};
    const errorContext = {
      response,
      request: context,
      error: __spreadProps(__spreadValues({}, errorObject), {
        status: response.status,
        statusText: response.statusText
      })
    };
    for (const onError of hooks.onError) {
      if (onError) {
        await onError(__spreadProps(__spreadValues({}, errorContext), {
          response: ((_g = options == null ? void 0 : options.hookOptions) == null ? void 0 : _g.cloneResponse) ? response.clone() : response
        }));
      }
    }
    if (options == null ? void 0 : options.retry) {
      const retryStrategy = createRetryStrategy(options.retry);
      const _retryAttempt = (_h = options.retryAttempt) != null ? _h : 0;
      if (await retryStrategy.shouldAttemptRetry(_retryAttempt, response)) {
        for (const onRetry of hooks.onRetry) {
          if (onRetry) {
            await onRetry(responseContext);
          }
        }
        const delay = retryStrategy.getDelay(_retryAttempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return await betterFetch(url, __spreadProps(__spreadValues({}, options), {
          retryAttempt: _retryAttempt + 1
        }));
      }
    }
    if (options == null ? void 0 : options.throw) {
      throw new BetterFetchError(
        response.status,
        response.statusText,
        errorObject
      );
    }
    return {
      data: null,
      error: __spreadProps(__spreadValues({}, errorObject), {
        status: response.status,
        statusText: response.statusText
      })
    };
  };

  // node_modules/nanostores/clean-stores/index.js
  var clean = Symbol("clean");

  // node_modules/nanostores/atom/index.js
  var listenerQueue = [];
  var lqIndex = 0;
  var QUEUE_ITEMS_PER_LISTENER = 4;
  var epoch = 0;
  var atom = (initialValue) => {
    let listeners = [];
    let $atom = {
      get() {
        if (!$atom.lc) {
          $atom.listen(() => {
          })();
        }
        return $atom.value;
      },
      lc: 0,
      listen(listener) {
        $atom.lc = listeners.push(listener);
        return () => {
          for (let i = lqIndex + QUEUE_ITEMS_PER_LISTENER; i < listenerQueue.length; ) {
            if (listenerQueue[i] === listener) {
              listenerQueue.splice(i, QUEUE_ITEMS_PER_LISTENER);
            } else {
              i += QUEUE_ITEMS_PER_LISTENER;
            }
          }
          let index = listeners.indexOf(listener);
          if (~index) {
            listeners.splice(index, 1);
            if (!--$atom.lc) $atom.off();
          }
        };
      },
      notify(oldValue, changedKey) {
        epoch++;
        let runListenerQueue = !listenerQueue.length;
        for (let listener of listeners) {
          listenerQueue.push(
            listener,
            $atom.value,
            oldValue,
            changedKey
          );
        }
        if (runListenerQueue) {
          for (lqIndex = 0; lqIndex < listenerQueue.length; lqIndex += QUEUE_ITEMS_PER_LISTENER) {
            listenerQueue[lqIndex](
              listenerQueue[lqIndex + 1],
              listenerQueue[lqIndex + 2],
              listenerQueue[lqIndex + 3]
            );
          }
          listenerQueue.length = 0;
        }
      },
      /* It will be called on last listener unsubscribing.
         We will redefine it in onMount and onStop. */
      off() {
      },
      set(newValue) {
        let oldValue = $atom.value;
        if (oldValue !== newValue) {
          $atom.value = newValue;
          $atom.notify(oldValue);
        }
      },
      subscribe(listener) {
        let unbind = $atom.listen(listener);
        listener($atom.value);
        return unbind;
      },
      value: initialValue
    };
    if (true) {
      $atom[clean] = () => {
        listeners = [];
        $atom.lc = 0;
        $atom.off();
      };
    }
    return $atom;
  };

  // node_modules/nanostores/lifecycle/index.js
  var MOUNT = 5;
  var UNMOUNT = 6;
  var REVERT_MUTATION = 10;
  var on = (object, listener, eventKey, mutateStore) => {
    object.events = object.events || {};
    if (!object.events[eventKey + REVERT_MUTATION]) {
      object.events[eventKey + REVERT_MUTATION] = mutateStore((eventProps) => {
        object.events[eventKey].reduceRight((event, l) => (l(event), event), {
          shared: {},
          ...eventProps
        });
      });
    }
    object.events[eventKey] = object.events[eventKey] || [];
    object.events[eventKey].push(listener);
    return () => {
      let currentListeners = object.events[eventKey];
      let index = currentListeners.indexOf(listener);
      currentListeners.splice(index, 1);
      if (!currentListeners.length) {
        delete object.events[eventKey];
        object.events[eventKey + REVERT_MUTATION]();
        delete object.events[eventKey + REVERT_MUTATION];
      }
    };
  };
  var STORE_UNMOUNT_DELAY = 1e3;
  var onMount = ($store, initialize) => {
    let listener = (payload) => {
      let destroy = initialize(payload);
      if (destroy) $store.events[UNMOUNT].push(destroy);
    };
    return on($store, listener, MOUNT, (runListeners) => {
      let originListen = $store.listen;
      $store.listen = (...args) => {
        if (!$store.lc && !$store.active) {
          $store.active = true;
          runListeners();
        }
        return originListen(...args);
      };
      let originOff = $store.off;
      $store.events[UNMOUNT] = [];
      $store.off = () => {
        originOff();
        setTimeout(() => {
          if ($store.active && !$store.lc) {
            $store.active = false;
            for (let destroy of $store.events[UNMOUNT]) destroy();
            $store.events[UNMOUNT] = [];
          }
        }, STORE_UNMOUNT_DELAY);
      };
      if (true) {
        let originClean = $store[clean];
        $store[clean] = () => {
          for (let destroy of $store.events[UNMOUNT]) destroy();
          $store.events[UNMOUNT] = [];
          $store.active = false;
          originClean();
        };
      }
      return () => {
        $store.listen = originListen;
        $store.off = originOff;
      };
    });
  };

  // node_modules/better-auth/dist/client.js
  var P = /* @__PURE__ */ Object.create(null);
  var m = (e) => globalThis.process?.env || globalThis.Deno?.env.toObject() || globalThis.__env__ || (e ? P : globalThis);
  var g = new Proxy(P, { get(e, t) {
    return m()[t] ?? P[t];
  }, has(e, t) {
    let n = m();
    return t in n || t in P;
  }, set(e, t, n) {
    let u = m(true);
    return u[t] = n, true;
  }, deleteProperty(e, t) {
    if (!t) return false;
    let n = m(true);
    return delete n[t], true;
  }, ownKeys() {
    let e = m(true);
    return Object.keys(e);
  } });
  function N(e) {
    return e ? e !== "false" : false;
  }
  var D = typeof process < "u" && process.env && "development" || "";
  var Z = D === "test" || N(g.TEST);
  var T = class extends Error {
    constructor(t, n) {
      super(t), this.name = "BetterAuthError", this.message = t, this.cause = n, this.stack = "";
    }
  };
  function j(e) {
    try {
      return new URL(e).pathname !== "/";
    } catch {
      throw new T(`Invalid base URL: ${e}. Please provide a valid base URL.`);
    }
  }
  function b(e, t = "/api/auth") {
    return j(e) ? e : (t = t.startsWith("/") ? t : `/${t}`, `${e}${t}`);
  }
  function E(e, t) {
    if (e) return b(e, t);
    let n = g.BETTER_AUTH_URL || g.NEXT_PUBLIC_BETTER_AUTH_URL || g.PUBLIC_BETTER_AUTH_URL || g.NUXT_PUBLIC_BETTER_AUTH_URL || g.NUXT_PUBLIC_AUTH_URL || (g.BASE_URL !== "/" ? g.BASE_URL : void 0);
    if (n) return b(n, t);
    if (typeof window < "u" && window.location) return b(window.location.origin, t);
  }
  var _ = { id: "redirect", name: "Redirect", hooks: { onSuccess(e) {
    if (e.data?.url && e.data?.redirect && typeof window < "u" && window.location && window.location) try {
      window.location.href = e.data.url;
    } catch {
    }
  } } };
  var w = { id: "add-current-url", name: "Add current URL", hooks: { onRequest(e) {
    if (typeof window < "u" && window.location && window.location) try {
      let t = new URL(e.url);
      t.searchParams.set("currentURL", window.location.href), e.url = t;
    } catch {
    }
    return e;
  } } };
  var U = (e, t, n, u) => {
    let o = atom({ data: null, error: null, isPending: true, isRefetching: false }), p = () => {
      let l = typeof u == "function" ? u({ data: o.get().data, error: o.get().error, isPending: o.get().isPending }) : u;
      return n(t, { ...l, async onSuccess(f) {
        o.set({ data: f.data, error: null, isPending: false, isRefetching: false }), await l?.onSuccess?.(f);
      }, async onError(f) {
        o.set({ error: f.error, data: null, isPending: false, isRefetching: false }), await l?.onError?.(f);
      }, async onRequest(f) {
        let i = o.get();
        o.set({ isPending: i.data === null, data: i.data, error: null, isRefetching: true }), await l?.onRequest?.(f);
      } });
    };
    e = Array.isArray(e) ? e : [e];
    let a = false;
    for (let l of e) l.subscribe(() => {
      a ? p() : onMount(o, () => (p(), a = true, () => {
        o.off(), l.off();
      }));
    });
    return o;
  };
  function I(e) {
    let t = atom(false);
    return { session: U(t, "/get-session", e, { method: "GET" }), $sessionSignal: t };
  }
  var V = { proto: /"(?:_|\\u0{2}5[Ff]){2}(?:p|\\u0{2}70)(?:r|\\u0{2}72)(?:o|\\u0{2}6[Ff])(?:t|\\u0{2}74)(?:o|\\u0{2}6[Ff])(?:_|\\u0{2}5[Ff]){2}"\s*:/, constructor: /"(?:c|\\u0063)(?:o|\\u006[Ff])(?:n|\\u006[Ee])(?:s|\\u0073)(?:t|\\u0074)(?:r|\\u0072)(?:u|\\u0075)(?:c|\\u0063)(?:t|\\u0074)(?:o|\\u006[Ff])(?:r|\\u0072)"\s*:/, protoShort: /"__proto__"\s*:/, constructorShort: /"constructor"\s*:/ };
  var W = /^\s*["[{]|^\s*-?\d{1,16}(\.\d{1,17})?([Ee][+-]?\d+)?\s*$/;
  var x = { true: true, false: false, null: null, undefined: void 0, nan: Number.NaN, infinity: Number.POSITIVE_INFINITY, "-infinity": Number.NEGATIVE_INFINITY };
  var G = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,7}))?(?:Z|([+-])(\d{2}):(\d{2}))$/;
  function J(e) {
    return e instanceof Date && !isNaN(e.getTime());
  }
  function z(e) {
    let t = G.exec(e);
    if (!t) return null;
    let [, n, u, o, p, a, l, f, i, s, c] = t, d = new Date(Date.UTC(parseInt(n, 10), parseInt(u, 10) - 1, parseInt(o, 10), parseInt(p, 10), parseInt(a, 10), parseInt(l, 10), f ? parseInt(f.padEnd(3, "0"), 10) : 0));
    if (i) {
      let r = (parseInt(s, 10) * 60 + parseInt(c, 10)) * (i === "+" ? -1 : 1);
      d.setUTCMinutes(d.getUTCMinutes() + r);
    }
    return J(d) ? d : null;
  }
  function X(e, t = {}) {
    let { strict: n = false, warnings: u = false, reviver: o, parseDates: p = true } = t;
    if (typeof e != "string") return e;
    let a = e.trim();
    if (a[0] === '"' && a.endsWith('"') && !a.slice(1, -1).includes('"')) return a.slice(1, -1);
    let l = a.toLowerCase();
    if (l.length <= 9 && l in x) return x[l];
    if (!W.test(a)) {
      if (n) throw new SyntaxError("[better-json] Invalid JSON");
      return e;
    }
    if (Object.entries(V).some(([i, s]) => {
      let c = s.test(a);
      return c && u && console.warn(`[better-json] Detected potential prototype pollution attempt using ${i} pattern`), c;
    }) && n) throw new Error("[better-json] Potential prototype pollution attempt detected");
    try {
      return JSON.parse(a, (s, c) => {
        if (s === "__proto__" || s === "constructor" && c && typeof c == "object" && "prototype" in c) {
          u && console.warn(`[better-json] Dropping "${s}" key to prevent prototype pollution`);
          return;
        }
        if (p && typeof c == "string") {
          let d = z(c);
          if (d) return d;
        }
        return o ? o(s, c) : c;
      });
    } catch (i) {
      if (n) throw i;
      return e;
    }
  }
  function B(e, t = { strict: true }) {
    return X(e, t);
  }
  var L = (e) => {
    let t = "credentials" in Request.prototype, n = E(e?.baseURL), u = e?.plugins?.flatMap((r) => r.fetchPlugins).filter((r) => r !== void 0) || [], o = createFetch({ baseURL: n, ...t ? { credentials: "include" } : {}, method: "GET", jsonParser(r) {
      return B(r, { strict: false });
    }, ...e?.fetchOptions, plugins: e?.disableDefaultFetchPlugins ? [...e?.fetchOptions?.plugins || [], ...u] : [_, w, ...e?.fetchOptions?.plugins || [], ...u] }), { $sessionSignal: p, session: a } = I(o), l = e?.plugins || [], f = {}, i = { $sessionSignal: p, session: a }, s = { "/sign-out": "POST", "/revoke-sessions": "POST", "/revoke-other-sessions": "POST", "/delete-user": "POST" }, c = [{ signal: "$sessionSignal", matcher(r) {
      return r === "/sign-out" || r === "/update-user" || r.startsWith("/sign-in") || r.startsWith("/sign-up");
    } }];
    for (let r of l) r.getAtoms && Object.assign(i, r.getAtoms?.(o)), r.pathMethods && Object.assign(s, r.pathMethods), r.atomListeners && c.push(...r.atomListeners);
    let d = { notify: (r) => {
      i[r].set(!i[r].get());
    }, listen: (r, O) => {
      i[r].subscribe(O);
    }, atoms: i };
    for (let r of l) r.getActions && Object.assign(f, r.getActions?.(o, d));
    return { pluginsActions: f, pluginsAtoms: i, pluginPathMethods: s, atomListeners: c, $fetch: o, $store: d };
  };
  function C(e) {
    return e.charAt(0).toUpperCase() + e.slice(1);
  }
  function Y(e, t, n) {
    let u = t[e], { fetchOptions: o, query: p, ...a } = n || {};
    return u || (o?.method ? o.method : a && Object.keys(a).length > 0 ? "POST" : "GET");
  }
  function v(e, t, n, u, o) {
    function p(a = []) {
      return new Proxy(function() {
      }, { get(l, f) {
        let i = [...a, f], s = e;
        for (let c of i) if (s && typeof s == "object" && c in s) s = s[c];
        else {
          s = void 0;
          break;
        }
        return typeof s == "function" ? s : p(i);
      }, apply: async (l, f, i) => {
        let s = "/" + a.map((R) => R.replace(/[A-Z]/g, (y) => `-${y.toLowerCase()}`)).join("/"), c = i[0] || {}, d = i[1] || {}, { query: r, fetchOptions: O, ...F } = c, h = { ...d, ...O }, S = Y(s, n, c);
        return await t(s, { ...h, body: S === "GET" ? void 0 : { ...F, ...h?.body || {} }, query: r || h?.query, method: S, async onSuccess(R) {
          await h?.onSuccess?.(R);
          let y = o?.find((k) => k.matcher(s));
          if (!y) return;
          let A = u[y.signal];
          if (!A) return;
          let $ = A.get();
          setTimeout(() => {
            A.set(!$);
          }, 10);
        } });
      } });
    }
    return p();
  }
  function _e(e) {
    let { pluginPathMethods: t, pluginsActions: n, pluginsAtoms: u, $fetch: o, atomListeners: p, $store: a } = L(e), l = {};
    for (let [s, c] of Object.entries(u)) l[`use${C(s)}`] = c;
    let f = { ...n, ...l, $fetch: o, $store: a };
    return v(f, o, t, u, p);
  }

  // client/auth.js
  var authClient = _e({
    baseURL: "http://localhost:3000"
    // the base url of your auth server
  });
  async function signUp(name, email, password) {
    console.log(name, email, password);
    const { data, error } = await authClient.signUp.email(
      {
        email,
        password,
        name
        // image: image ? convertImageToBase64(image) : undefined,
      },
      {
        onRequest: (ctx) => {
        },
        onSuccess: (ctx) => {
          alert("Success");
        },
        onError: (ctx) => {
          alert(ctx.error.message);
        }
      }
    );
  }
  window.exerciseTracker = { signUp };
})();
//# sourceMappingURL=main.js.map
