import "dotenv/config";
import { MongoClient } from "mongodb";

const OWNER_NAME = "warisul";
const OWNER_EMAIL = "mdwarisulislam88@gmail.com";

const cover = (isbn) => `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;

const data = [
  { title: "Pride and Prejudice", author: "Jane Austen", category: "Fiction", isbn: "9780141439518", description: "Elizabeth Bennet and Mr Darcy clash over pride, class and first impressions in Regency England." },
  { title: "1984", author: "George Orwell", category: "Fiction", isbn: "9780451524935", description: "A man tries to think freely in a world where the Party watches everyone and rewrites the truth." },
  { title: "To Kill a Mockingbird", author: "Harper Lee", category: "Fiction", isbn: "9780061120084", description: "A young girl in the American South watches her lawyer father defend a man in an unfair trial." },
  { title: "The Great Gatsby", author: "F. Scott Fitzgerald", category: "Fiction", isbn: "9780743273565", description: "A mysterious millionaire throws grand parties in the hope of winning back his lost love." },
  { title: "The Alchemist", author: "Paulo Coelho", category: "Fiction", isbn: "9780062315007", description: "A shepherd boy travels from Spain to Egypt in search of treasure and his personal destiny." },
  { title: "A Brief History of Time", author: "Stephen Hawking", category: "Science", isbn: "9780553380163", description: "A clear introduction to black holes, the Big Bang and the nature of time." },
  { title: "Cosmos", author: "Carl Sagan", category: "Science", isbn: "9780345539434", description: "A journey through the universe, from the stars to the origins of life on Earth." },
  { title: "The Selfish Gene", author: "Richard Dawkins", category: "Science", isbn: "9780198788607", description: "A classic look at evolution from the point of view of the gene." },
  { title: "Sapiens", author: "Yuval Noah Harari", category: "History", isbn: "9780062316097", description: "A brief history of humankind, from the first humans to the modern world." },
  { title: "Guns, Germs, and Steel", author: "Jared Diamond", category: "History", isbn: "9780393317558", description: "Why some societies grew powerful while others did not, explained through geography and environment." },
  { title: "The Diary of a Young Girl", author: "Anne Frank", category: "History", isbn: "9780553296983", description: "The diary of a teenage girl hiding with her family during the Second World War." },
  { title: "The Little Prince", author: "Antoine de Saint-Exupery", category: "Kids", isbn: "9780156012195", description: "A pilot in the desert meets a small prince who has travelled from a tiny faraway planet." },
  { title: "Charlotte's Web", author: "E. B. White", category: "Kids", isbn: "9780061124952", description: "A clever spider saves the life of a pig named Wilbur with a few well chosen words." },
  { title: "Matilda", author: "Roald Dahl", category: "Kids", isbn: "9780142410370", description: "A gifted little girl uses her brain and special powers against unkind grown-ups." },
  { title: "Where the Wild Things Are", author: "Maurice Sendak", category: "Kids", isbn: "9780064431781", description: "Max sails away to an island of wild creatures and becomes their king." },
  { title: "Harry Potter and the Sorcerer's Stone", author: "J. K. Rowling", category: "Kids", isbn: "9780590353427", description: "An orphan boy learns he is a wizard and starts school at Hogwarts." },
  { title: "Atomic Habits", author: "James Clear", category: "Others", isbn: "9780735211292", description: "Small daily habits and how they build into big long term results." },
  { title: "Man's Search for Meaning", author: "Viktor E. Frankl", category: "Others", isbn: "9780807014295", description: "A psychiatrist reflects on surviving the camps and finding purpose in suffering." },
];

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const db = client.db("booknook");
const books = db.collection("books");
const borrows = db.collection("borrows");


const old = await books.find({ $or: [{ image: /picsum\.photos/ }, { source: "seed-real" }] }).toArray();
if (old.length) {
  await borrows.deleteMany({ bookId: { $in: old.map((b) => String(b._id)) } });
  await books.deleteMany({ _id: { $in: old.map((b) => b._id) } });
}

const now = Date.now();
await books.insertMany(
  data.map(({ isbn, ...b }, i) => ({
    ...b,
    image: cover(isbn),
    copies: 3,
    source: "seed-real",
    addedBy: OWNER_NAME,
    addedByEmail: OWNER_EMAIL,
    createdAt: new Date(now - i * 1000),
  }))
);

console.log("Removed", old.length, "old books, added", data.length, "books");
await client.close();