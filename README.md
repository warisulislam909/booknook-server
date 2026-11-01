# BookNook Server
Express + MongoDB API. JWTs issued by BetterAuth (client) are verified with `jose` via the client's JWKS endpoint.
Setup: `cp .env.example .env`, fill values, `npm i && npm run dev`. Deploy on Render (start: `npm start`).
## Environment Variables
| Variable | Purpose |
|---|---|
| PORT | Port the server listens on (default 5000) |
| MONGODB_URI | MongoDB connection string |
| CLIENT_URL | Frontend URL, used for CORS and to fetch the JWKS public keys |

## Data Models
**books:** title, author, category, image, description, copies, addedBy, addedByEmail, createdAt

**borrows:** bookId, bookTitle, bookImage, userName, userEmail, borrowDate, returnDate

A unique index on (bookId, userEmail) prevents borrowing the same book twice.

## Deployment (Render)
1. Push this repo to GitHub.
2. Create a new Web Service on Render and connect the repo.
3. Build command: `npm install`, start command: `npm start`.
4. Add `MONGODB_URI` and `CLIENT_URL` in the Environment tab.
5. In MongoDB Atlas, allow network access from `0.0.0.0/0`.