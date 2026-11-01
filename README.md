# BookNook Server
Express + MongoDB API. JWTs issued by BetterAuth (client) are verified with `jose` via the client's JWKS endpoint.
Setup: `cp .env.example .env`, fill values, `npm i && npm run dev`. Deploy on Render (start: `npm start`).
## Environment Variables
| Variable | Purpose |
|---|---|
| PORT | Port the server listens on (default 5000) |
| MONGODB_URI | MongoDB connection string |
| CLIENT_URL | Frontend URL, used for CORS and to fetch the JWKS public keys |