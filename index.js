import "dotenv/config";
import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import { createRemoteJWKSet, jwtVerify } from "jose";

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());

const client = new MongoClient(process.env.MONGODB_URI);
const db = client.db("booknook");
const books = db.collection("books");
const borrows = db.collection("borrows");


const JWKS = createRemoteJWKSet(new URL(`${process.env.CLIENT_URL}/api/auth/jwks`));

const verifyToken = async (req, res, next) => {
  try {
    const token = (req.headers.authorization || "").split(" ")[1];
    if (!token) return res.status(401).json({ message: "Please login first" });
    const { payload } = await jwtVerify(token, JWKS);
    req.user = { email: payload.email, name: payload.name };
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

const toId = (id) => (ObjectId.isValid(id) ? new ObjectId(id) : null);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

app.get("/", (_req, res) => res.json({ app: "BookNook API", status: "running" }));

// 1. all books (public). ?limit=6 gives the newest first
app.get("/books", async (req, res) => {
  const { limit, category, search } = req.query;
  const q = {};
  if (category) q.category = category;
  if (search) q.title = { $regex: esc(search), $options: "i" };
  const list = await books.find(q).sort({ createdAt: -1 }).limit(Math.min(Number(limit) || 0, 100)).toArray();
  res.json(list);
});

// 2. one book
app.get("/books/:id", verifyToken, async (req, res) => {
  const _id = toId(req.params.id);
  const book = _id && (await books.findOne({ _id }));
  if (!book) return res.status(404).json({ message: "Book not found" });
  res.json(book);
});

// 3. add book
app.post("/books", verifyToken, async (req, res) => {
  const { title, author, category, image, description, copies } = req.body;
  if (!title || !author || !category || !image || !description)
    return res.status(400).json({ message: "All fields are required" });
  const doc = {
    title, author, category, image, description,
    copies: Math.max(Number(copies) || 1, 1),
    addedBy: req.user.name, addedByEmail: req.user.email,
    createdAt: new Date(),
  };
  const result = await books.insertOne(doc);
  res.status(201).json({ ...doc, _id: result.insertedId });
});


app.patch("/books/:id", verifyToken, async (req, res) => {
  const _id = toId(req.params.id);
  const allowed = ["title", "author", "category", "image", "description", "copies"];
  const $set = {};
  allowed.forEach((k) => req.body[k] !== undefined && ($set[k] = k === "copies" ? Math.max(Number(req.body[k]) || 0, 0) : req.body[k]));
  const result = await books.updateOne({ _id, addedByEmail: req.user.email }, { $set });
  if (!result.matchedCount) return res.status(403).json({ message: "Not allowed or book not found" });
  res.json({ message: "Book updated" });
});

// 5. delete book (owner only)
app.delete("/books/:id", verifyToken, async (req, res) => {
  const _id = toId(req.params.id);
  const result = await books.deleteOne({ _id, addedByEmail: req.user.email });
  if (!result.deletedCount) return res.status(403).json({ message: "Not allowed or book not found" });
  await borrows.deleteMany({ bookId: String(_id) });
  res.json({ message: "Book deleted" });
});

// 6. borrow a book (no double borrow, copies -1)
app.post("/borrows", verifyToken, async (req, res) => {
  const _id = toId(req.body.bookId);
  if (!_id) return res.status(400).json({ message: "Invalid book" });
  const already = await borrows.findOne({ bookId: String(_id), userEmail: req.user.email });
  if (already) return res.status(409).json({ message: "You have already borrowed this book" });

  const book = await books.findOneAndUpdate(
    { _id, copies: { $gt: 0 } }, { $inc: { copies: -1 } }, { returnDocument: "after" }
  );
  if (!book) return res.status(400).json({ message: "This book is not available right now" });

  const borrowDate = new Date();
  const returnDate = new Date(borrowDate.getTime() + 7 * 24 * 60 * 60 * 1000);
  try {
    const doc = {
      bookId: String(_id), bookTitle: book.title, bookImage: book.image,
      userName: req.user.name, userEmail: req.user.email, borrowDate, returnDate,
    };
    const r = await borrows.insertOne(doc);
    res.status(201).json({ ...doc, _id: r.insertedId });
  } catch {
    await books.updateOne({ _id }, { $inc: { copies: 1 } }); // undo on race-condition duplicate
    res.status(409).json({ message: "You have already borrowed this book" });
  }
});


app.get("/borrows", verifyToken, async (req, res) => {
  res.json(await borrows.find({ userEmail: req.user.email }).sort({ borrowDate: -1 }).toArray());
});


app.delete("/borrows/:id", verifyToken, async (req, res) => {
  const _id = toId(req.params.id);
  const b = await borrows.findOneAndDelete({ _id, userEmail: req.user.email });
  if (!b) return res.status(404).json({ message: "Borrow record not found" });
  await books.updateOne({ _id: toId(b.bookId) }, { $inc: { copies: 1 } });
  res.json({ message: "Book returned" });
});

const port = process.env.PORT || 5000;
client.connect().then(async () => {
  await borrows.createIndex({ bookId: 1, userEmail: 1 }, { unique: true });
  app.listen(port, () => console.log(`BookNook API on ${port}`));
});
