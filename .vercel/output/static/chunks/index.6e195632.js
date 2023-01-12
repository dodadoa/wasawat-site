var I = { exports: {} },
  r = {}
/**
 * @license React
 * react.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */ var y = Symbol.for("react.element"),
  T = Symbol.for("react.portal"),
  V = Symbol.for("react.fragment"),
  A = Symbol.for("react.strict_mode"),
  D = Symbol.for("react.profiler"),
  U = Symbol.for("react.provider"),
  q = Symbol.for("react.context"),
  F = Symbol.for("react.forward_ref"),
  L = Symbol.for("react.suspense"),
  M = Symbol.for("react.memo"),
  N = Symbol.for("react.lazy"),
  w = Symbol.iterator
function z(e) {
  return e === null || typeof e != "object"
    ? null
    : ((e = (w && e[w]) || e["@@iterator"]), typeof e == "function" ? e : null)
}
var b = {
    isMounted: function () {
      return !1
    },
    enqueueForceUpdate: function () {},
    enqueueReplaceState: function () {},
    enqueueSetState: function () {},
  },
  C = Object.assign,
  j = {}
function p(e, t, n) {
  ;(this.props = e),
    (this.context = t),
    (this.refs = j),
    (this.updater = n || b)
}
p.prototype.isReactComponent = {}
p.prototype.setState = function (e, t) {
  if (typeof e != "object" && typeof e != "function" && e != null)
    throw Error(
      "setState(...): takes an object of state variables to update or a function which returns an object of state variables."
    )
  this.updater.enqueueSetState(this, e, t, "setState")
}
p.prototype.forceUpdate = function (e) {
  this.updater.enqueueForceUpdate(this, e, "forceUpdate")
}
function x() {}
x.prototype = p.prototype
function m(e, t, n) {
  ;(this.props = e),
    (this.context = t),
    (this.refs = j),
    (this.updater = n || b)
}
var S = (m.prototype = new x())
S.constructor = m
C(S, p.prototype)
S.isPureReactComponent = !0
var R = Array.isArray,
  O = Object.prototype.hasOwnProperty,
  E = { current: null },
  g = { key: !0, ref: !0, __self: !0, __source: !0 }
function P(e, t, n) {
  var u,
    o = {},
    c = null,
    s = null
  if (t != null)
    for (u in (t.ref !== void 0 && (s = t.ref),
    t.key !== void 0 && (c = "" + t.key),
    t))
      O.call(t, u) && !g.hasOwnProperty(u) && (o[u] = t[u])
  var f = arguments.length - 2
  if (f === 1) o.children = n
  else if (1 < f) {
    for (var i = Array(f), a = 0; a < f; a++) i[a] = arguments[a + 2]
    o.children = i
  }
  if (e && e.defaultProps)
    for (u in ((f = e.defaultProps), f)) o[u] === void 0 && (o[u] = f[u])
  return { $$typeof: y, type: e, key: c, ref: s, props: o, _owner: E.current }
}
function B(e, t) {
  return {
    $$typeof: y,
    type: e.type,
    key: t,
    ref: e.ref,
    props: e.props,
    _owner: e._owner,
  }
}
function k(e) {
  return typeof e == "object" && e !== null && e.$$typeof === y
}
function H(e) {
  var t = { "=": "=0", ":": "=2" }
  return (
    "$" +
    e.replace(/[=:]/g, function (n) {
      return t[n]
    })
  )
}
var $ = /\/+/g
function v(e, t) {
  return typeof e == "object" && e !== null && e.key != null
    ? H("" + e.key)
    : t.toString(36)
}
function _(e, t, n, u, o) {
  var c = typeof e
  ;(c === "undefined" || c === "boolean") && (e = null)
  var s = !1
  if (e === null) s = !0
  else
    switch (c) {
      case "string":
      case "number":
        s = !0
        break
      case "object":
        switch (e.$$typeof) {
          case y:
          case T:
            s = !0
        }
    }
  if (s)
    return (
      (s = e),
      (o = o(s)),
      (e = u === "" ? "." + v(s, 0) : u),
      R(o)
        ? ((n = ""),
          e != null && (n = e.replace($, "$&/") + "/"),
          _(o, t, n, "", function (a) {
            return a
          }))
        : o != null &&
          (k(o) &&
            (o = B(
              o,
              n +
                (!o.key || (s && s.key === o.key)
                  ? ""
                  : ("" + o.key).replace($, "$&/") + "/") +
                e
            )),
          t.push(o)),
      1
    )
  if (((s = 0), (u = u === "" ? "." : u + ":"), R(e)))
    for (var f = 0; f < e.length; f++) {
      c = e[f]
      var i = u + v(c, f)
      s += _(c, t, n, i, o)
    }
  else if (((i = z(e)), typeof i == "function"))
    for (e = i.call(e), f = 0; !(c = e.next()).done; )
      (c = c.value), (i = u + v(c, f++)), (s += _(c, t, n, i, o))
  else if (c === "object")
    throw (
      ((t = String(e)),
      Error(
        "Objects are not valid as a React child (found: " +
          (t === "[object Object]"
            ? "object with keys {" + Object.keys(e).join(", ") + "}"
            : t) +
          "). If you meant to render a collection of children, use an array instead."
      ))
    )
  return s
}
function d(e, t, n) {
  if (e == null) return e
  var u = [],
    o = 0
  return (
    _(e, u, "", "", function (c) {
      return t.call(n, c, o++)
    }),
    u
  )
}
function W(e) {
  if (e._status === -1) {
    var t = e._result
    ;(t = t()),
      t.then(
        function (n) {
          ;(e._status === 0 || e._status === -1) &&
            ((e._status = 1), (e._result = n))
        },
        function (n) {
          ;(e._status === 0 || e._status === -1) &&
            ((e._status = 2), (e._result = n))
        }
      ),
      e._status === -1 && ((e._status = 0), (e._result = t))
  }
  if (e._status === 1) return e._result.default
  throw e._result
}
var l = { current: null },
  h = { transition: null },
  G = {
    ReactCurrentDispatcher: l,
    ReactCurrentBatchConfig: h,
    ReactCurrentOwner: E,
  }
r.Children = {
  map: d,
  forEach: function (e, t, n) {
    d(
      e,
      function () {
        t.apply(this, arguments)
      },
      n
    )
  },
  count: function (e) {
    var t = 0
    return (
      d(e, function () {
        t++
      }),
      t
    )
  },
  toArray: function (e) {
    return (
      d(e, function (t) {
        return t
      }) || []
    )
  },
  only: function (e) {
    if (!k(e))
      throw Error(
        "React.Children.only expected to receive a single React element child."
      )
    return e
  },
}
r.Component = p
r.Fragment = V
r.Profiler = D
r.PureComponent = m
r.StrictMode = A
r.Suspense = L
r.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = G
r.cloneElement = function (e, t, n) {
  if (e == null)
    throw Error(
      "React.cloneElement(...): The argument must be a React element, but you passed " +
        e +
        "."
    )
  var u = C({}, e.props),
    o = e.key,
    c = e.ref,
    s = e._owner
  if (t != null) {
    if (
      (t.ref !== void 0 && ((c = t.ref), (s = E.current)),
      t.key !== void 0 && (o = "" + t.key),
      e.type && e.type.defaultProps)
    )
      var f = e.type.defaultProps
    for (i in t)
      O.call(t, i) &&
        !g.hasOwnProperty(i) &&
        (u[i] = t[i] === void 0 && f !== void 0 ? f[i] : t[i])
  }
  var i = arguments.length - 2
  if (i === 1) u.children = n
  else if (1 < i) {
    f = Array(i)
    for (var a = 0; a < i; a++) f[a] = arguments[a + 2]
    u.children = f
  }
  return { $$typeof: y, type: e.type, key: o, ref: c, props: u, _owner: s }
}
r.createContext = function (e) {
  return (
    (e = {
      $$typeof: q,
      _currentValue: e,
      _currentValue2: e,
      _threadCount: 0,
      Provider: null,
      Consumer: null,
      _defaultValue: null,
      _globalName: null,
    }),
    (e.Provider = { $$typeof: U, _context: e }),
    (e.Consumer = e)
  )
}
r.createElement = P
r.createFactory = function (e) {
  var t = P.bind(null, e)
  return (t.type = e), t
}
r.createRef = function () {
  return { current: null }
}
r.forwardRef = function (e) {
  return { $$typeof: F, render: e }
}
r.isValidElement = k
r.lazy = function (e) {
  return { $$typeof: N, _payload: { _status: -1, _result: e }, _init: W }
}
r.memo = function (e, t) {
  return { $$typeof: M, type: e, compare: t === void 0 ? null : t }
}
r.startTransition = function (e) {
  var t = h.transition
  h.transition = {}
  try {
    e()
  } finally {
    h.transition = t
  }
}
r.unstable_act = function () {
  throw Error("act(...) is not supported in production builds of React.")
}
r.useCallback = function (e, t) {
  return l.current.useCallback(e, t)
}
r.useContext = function (e) {
  return l.current.useContext(e)
}
r.useDebugValue = function () {}
r.useDeferredValue = function (e) {
  return l.current.useDeferredValue(e)
}
r.useEffect = function (e, t) {
  return l.current.useEffect(e, t)
}
r.useId = function () {
  return l.current.useId()
}
r.useImperativeHandle = function (e, t, n) {
  return l.current.useImperativeHandle(e, t, n)
}
r.useInsertionEffect = function (e, t) {
  return l.current.useInsertionEffect(e, t)
}
r.useLayoutEffect = function (e, t) {
  return l.current.useLayoutEffect(e, t)
}
r.useMemo = function (e, t) {
  return l.current.useMemo(e, t)
}
r.useReducer = function (e, t, n) {
  return l.current.useReducer(e, t, n)
}
r.useRef = function (e) {
  return l.current.useRef(e)
}
r.useState = function (e) {
  return l.current.useState(e)
}
r.useSyncExternalStore = function (e, t, n) {
  return l.current.useSyncExternalStore(e, t, n)
}
r.useTransition = function () {
  return l.current.useTransition()
}
r.version = "18.2.0"
;(function (e) {
  e.exports = r
})(I)
export { I as r }
