import { r as x } from "./chunks/index.6e195632.js"
var e = { exports: {} },
  a = {}
/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */ var c = x.exports,
  d = Symbol.for("react.element"),
  h = Symbol.for("react.fragment"),
  f = Object.prototype.hasOwnProperty,
  m = c.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,
  u = { key: !0, ref: !0, __self: !0, __source: !0 }
function p(t, r, i) {
  var s,
    o = {},
    l = null,
    n = null
  i !== void 0 && (l = "" + i),
    r.key !== void 0 && (l = "" + r.key),
    r.ref !== void 0 && (n = r.ref)
  for (s in r) f.call(r, s) && !u.hasOwnProperty(s) && (o[s] = r[s])
  if (t && t.defaultProps)
    for (s in ((r = t.defaultProps), r)) o[s] === void 0 && (o[s] = r[s])
  return { $$typeof: d, type: t, key: l, ref: n, props: o, _owner: m.current }
}
a.Fragment = h
a.jsx = p
a.jsxs = p
;(function (t) {
  t.exports = a
})(e)
const j = () => {
  const [t, r] = x.exports.useState(!1)
  return e.exports.jsxs("nav", {
    className:
      "fixed top-0 flex flex-row justify-between border-b-[1px] border-b-white h-16 w-full bg-black",
    children: [
      e.exports.jsx("div", {
        className: "p-4 pl-6",
        children: e.exports.jsx("a", {
          href: "/",
          className: "text-white",
          children: " ~/giang ",
        }),
      }),
      e.exports.jsxs("div", {
        className: "flex flex-row justify-between mr-20 w-48",
        children: [
          e.exports.jsxs("div", {
            onMouseEnter: () => r(!0),
            onMouseLeave: () => r(!1),
            children: [
              e.exports.jsx("p", {
                className: "text-white m-4 cursor-pointer",
                children: " /showcase ",
              }),
              t &&
                e.exports.jsxs("div", {
                  className: "relative mt-8 w-24",
                  children: [
                    e.exports.jsx("div", {
                      className: "p-4 py-2",
                      children: e.exports.jsx("p", {
                        className: "text-white",
                        children: "/visual",
                      }),
                    }),
                    e.exports.jsx("div", {
                      className: "p-4 py-2",
                      children: e.exports.jsx("p", {
                        className: "text-white",
                        children: "/sound",
                      }),
                    }),
                    e.exports.jsx("div", {
                      className: "p-4 py-2",
                      children: e.exports.jsx("p", {
                        className: "text-white",
                        children: "/collaboration",
                      }),
                    }),
                  ],
                }),
            ],
          }),
          e.exports.jsx("a", {
            href: "/blog",
            className: "text-white m-4 cursor-pointer",
            children: "/blog",
          }),
          e.exports.jsx("a", {
            href: "/about",
            className: "text-white m-4 cursor-pointer",
            children: "/about",
          }),
        ],
      }),
    ],
  })
}
export { j as default }
