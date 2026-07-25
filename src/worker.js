import {
  loginHandler,
  callbackHandler
} from "./auth.js";

import {
  quoteHandler
} from "./quotes.js";

import {
  historyHandler
} from "./history.js";

import {
  jsonResponse
} from "./utils.js";

import {
    getWatchlistsHandler
} from "./watchlist.js";

export default {

  async fetch(request, env) {

    const url = new URL(request.url);

    switch (url.pathname) {

      case "/":
        return jsonResponse({
          service: "Hunter Cloud",
          version: "1.0.0",
          status: "online"
        });

      case "/status":
        return jsonResponse({
          status: "ok",
          time: new Date().toISOString()
        });

      case "/auth/login":
        return loginHandler(env);

      case "/auth/callback":
        return callbackHandler(request, env);

      case "/quote":
        return quoteHandler(request, env);

      case "/history":
        return historyHandler(request, env);

      case "/watchlists":
        return getWatchlistsHandler(request, env);

      default:
        return jsonResponse({
          error: "Not Found"
        }, 404);

    }

  }

};