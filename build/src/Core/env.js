"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
require("dotenv").config();
var env;
(function (env) {
    function get(name) {
        return process.env[name];
    }
    env.get = get;
})(env = exports.env || (exports.env = {}));
