"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isRedirect = exports.AbortError = exports.FetchError = exports.Response = exports.Request = exports.Headers = exports.nodeFetch = exports.CookieParseError = exports.Cookie = exports.CookieJar = exports.fetch = void 0;
const node_fetch_1 = __importStar(require("node-fetch"));
exports.nodeFetch = node_fetch_1.default;
Object.defineProperty(exports, "Headers", { enumerable: true, get: function () { return node_fetch_1.Headers; } });
Object.defineProperty(exports, "Request", { enumerable: true, get: function () { return node_fetch_1.Request; } });
Object.defineProperty(exports, "Response", { enumerable: true, get: function () { return node_fetch_1.Response; } });
Object.defineProperty(exports, "FetchError", { enumerable: true, get: function () { return node_fetch_1.FetchError; } });
Object.defineProperty(exports, "AbortError", { enumerable: true, get: function () { return node_fetch_1.AbortError; } });
const cookie_jar_1 = __importDefault(require("./cookie-jar"));
exports.CookieJar = cookie_jar_1.default;
const cookie_1 = __importDefault(require("./cookie"));
exports.Cookie = cookie_1.default;
const errors_1 = require("./errors");
Object.defineProperty(exports, "CookieParseError", { enumerable: true, get: function () { return errors_1.CookieParseError; } });
const { isRedirect } = node_fetch_1.default;
exports.isRedirect = isRedirect;
async function fetch(cookieJars, url, options) {
    let cookies = "";
    const addValidFromJars = jars => {
        // since multiple cookie jars can be passed, filter duplicates by using a set of cookie names
        const set = new Set();
        jars.flatMap(jar => [...jar.cookiesValidForRequest(url)]).forEach(cookie => {
            if (set.has(cookie.name))
                return;
            set.add(cookie.name);
            cookies += cookie.serialize() + "; ";
        });
    };
    if (cookieJars) {
        if (Array.isArray(cookieJars) &&
            cookieJars.every(c => c instanceof cookie_jar_1.default))
            addValidFromJars(cookieJars.filter(jar => jar.flags.includes("r")));
        else if (cookieJars instanceof cookie_jar_1.default)
            if (cookieJars.flags.includes("r"))
                addValidFromJars([cookieJars]);
            else
                throw (0, errors_1.paramError)("First", "cookieJars", "fetch", [
                    "CookieJar",
                    "[CookieJar]"
                ]);
    }
    const wantFollow = !options || !options.redirect || options.redirect === "follow";
    if (!options) {
        if (cookies || wantFollow)
            options = {};
    }
    // shallow copy so we don't modify the original options object
    else
        options = { ...options };
    if (options.follow !== undefined &&
        (!Number.isSafeInteger(options.follow) || options.follow < 0))
        throw new TypeError("options.follow is not a safe positive integer");
    if (cookies) {
        // copy Headers as well so we don't modify it
        // or, if headers is an object, construct a Headers object from it
        options.headers = new node_fetch_1.Headers(options.headers);
        options.headers.append("cookie", cookies.slice(0, -2));
    }
    if (wantFollow)
        options.redirect = "manual";
    const result = await (0, node_fetch_1.default)(url, options);
    // I cannot use headers.get() here because it joins the cookies to a string
    cookies = result.headers.raw()["set-cookie"];
    if (cookies && cookieJars) {
        if (Array.isArray(cookieJars)) {
            cookieJars
                .filter(jar => jar.flags.includes("w"))
                .forEach(jar => cookies.forEach(c => jar.addCookie(c, url)));
        }
        else if (cookieJars instanceof cookie_jar_1.default &&
            cookieJars.flags.includes("w"))
            cookies.forEach(c => cookieJars.addCookie(c, url));
    }
    if (wantFollow && isRedirect(result.status)) {
        if (options.follow !== undefined && --options.follow < 0)
            throw new node_fetch_1.FetchError("maximum redirect reached at: " + url, "max-redirect");
        // change method to "GET" and remove body & content-length if response is 303 or 301/302 with POST method
        if (result.status === 303 ||
            ((result.status === 301 || result.status === 302) &&
                typeof options.method === "string" &&
                options.method.toUpperCase() === "POST")) {
            options.method = "GET";
            delete options.body;
            if (options.headers)
                options.headers.delete("content-length");
        }
        const location = result.headers.get("location");
        options.redirect = "follow";
        return fetch(cookieJars, location, options);
    }
    return result;
}
exports.fetch = fetch;
exports.default = fetch;
