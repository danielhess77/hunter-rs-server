import {
  loginHandler,
  callbackHandler,
  quoteHandler
} from "./schwab.js";

export default {

  async fetch(request, env) {

    const url = new URL(request.url);

    switch (url.pathname) {

      case "/":
        return json({
          service: "Hunter Cloud",
          version: "1.0.0",
          status: "online"
        });

      case "/status":
        return json({
          status: "ok",
          time: new Date().toISOString()
        });

      case "/auth/login":
        return loginHandler(env);

      case "/auth/callback":
        return callbackHandler(request, env);

      case "/quote":
        return quoteHandler(request, env);

      default:
        return new Response("Not Found", {
          status: 404
        });

    }

  }

};

function json(data) {

  return new Response(
    JSON.stringify(data, null, 2),
    {
      headers: {
        "Content-Type": "application/json"
      }
    }
  );

}

import {
  loginHandler,
  callbackHandler,
  quoteHandler
} from "./schwab.js";

export default {

  async fetch(request, env) {

    const url = new URL(request.url);

    switch (url.pathname) {

      case "/":
        return json({
          service: "Hunter Cloud",
          version: "1.0.0",
          status: "online"
        });

      case "/status":
        return json({
          status: "ok",
          time: new Date().toISOString()
        });

      case "/auth/login":
        return loginHandler(env);

      case "/auth/callback":
        return callbackHandler(request, env);

      case "/quote":
        return quoteHandler(request, env);

      default:
        return new Response("Not Found", {
          status: 404
        });

    }

  }

};

function json(data) {

  return new Response(
    JSON.stringify(data, null, 2),
    {
      headers: {
        "Content-Type": "application/json"
      }
    }
  );

}