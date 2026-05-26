const app = require("../../server/app");

export default function handler(req, res) {
  if (req.url && !req.url.startsWith("/api")) {
    req.url = `/api${req.url}`;
  }
  return app(req, res);
}

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};
