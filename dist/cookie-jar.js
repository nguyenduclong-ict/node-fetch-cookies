"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const url_1 = __importDefault(require("url"));
const cookie_1 = __importDefault(require("./cookie"));
const errors_1 = require("./errors");
class CookieJar {
    constructor(file, flags = "rw", cookies, cookieIgnoreCallback) {
        this.cookies = new Map();
        if (file && typeof file !== "string")
            throw (0, errors_1.paramError)("Second", "file", "new CookieJar()", "string");
        if (typeof flags !== "string")
            throw (0, errors_1.paramError)("First", "flags", "new CookieJar()", "string");
        if (Array.isArray(cookies)) {
            if (!cookies.every(c => c instanceof cookie_1.default))
                throw (0, errors_1.paramError)("Third", "cookies", "new CookieJar()", "[Cookie]");
            cookies.forEach(cookie => this.addCookie(cookie));
        }
        else if (cookies instanceof cookie_1.default)
            this.addCookie(cookies);
        else if (cookies)
            throw (0, errors_1.paramError)("Third", "cookies", "new CookieJar()", [
                "[Cookie]",
                "Cookie"
            ]);
        if (cookieIgnoreCallback && typeof cookieIgnoreCallback !== "function")
            throw (0, errors_1.paramError)("Fourth", "cookieIgnoreCallback", "new CookieJar()", "function");
        this.file = file;
        this.flags = flags;
        this.cookieIgnoreCallback = cookieIgnoreCallback;
    }
    addCookie(cookie, fromURL) {
        if (typeof cookie === "string") {
            try {
                cookie = new cookie_1.default(cookie, fromURL);
            }
            catch (error) {
                if (error instanceof errors_1.CookieParseError) {
                    if (this.cookieIgnoreCallback)
                        this.cookieIgnoreCallback(cookie, error.message);
                    return false;
                }
                throw error;
            }
        }
        else if (!(cookie instanceof cookie_1.default))
            throw (0, errors_1.paramError)("First", "cookie", "CookieJar.addCookie()", [
                "string",
                "Cookie"
            ]);
        if (!this.cookies.has(cookie.domain))
            this.cookies.set(cookie.domain, new Map());
        this.cookies.get(cookie.domain).set(cookie.name, cookie);
        return true;
    }
    domains() {
        return this.cookies.keys();
    }
    *cookiesDomain(domain) {
        for (const cookie of (this.cookies.get(domain) || []).values())
            yield cookie;
    }
    *cookiesValid(withSession) {
        for (const cookie of this.cookiesAll())
            if (!cookie.hasExpired(!withSession))
                yield cookie;
    }
    *cookiesAll() {
        for (const domain of this.domains())
            yield* this.cookiesDomain(domain);
    }
    *cookiesValidForRequest(requestURL) {
        const namesYielded = new Set(), domains = url_1.default
            .parse(requestURL)
            .hostname.split(".")
            .map((_, i, a) => a.slice(i).join("."));
        for (const domain of domains) {
            for (const cookie of this.cookiesDomain(domain)) {
                if (cookie.isValidForRequest(requestURL) &&
                    !namesYielded.has(cookie.name)) {
                    namesYielded.add(cookie.name);
                    yield cookie;
                }
            }
        }
    }
    deleteExpired(sessionEnded) {
        const validCookies = [...this.cookiesValid(!sessionEnded)];
        this.cookies = new Map();
        validCookies.forEach(c => this.addCookie(c));
    }
    async load(file = this.file) {
        if (typeof file !== "string")
            throw new Error("No file has been specified for this cookie jar!");
        JSON.parse(await fs_1.promises.readFile(file)).forEach(c => this.addCookie(cookie_1.default.fromObject(c)));
    }
    async save(file = this.file) {
        if (typeof file !== "string")
            throw new Error("No file has been specified for this cookie jar!");
        // only save cookies that haven't expired
        await fs_1.promises.writeFile(file, JSON.stringify([...this.cookiesValid(false)]));
    }
}
exports.default = CookieJar;
