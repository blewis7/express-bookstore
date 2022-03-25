process.env.NODE_ENV = "test";

const { Test } = require("supertest");
const request = require("supertest");

const app = require("./app");
const db = require("./db");

let isbn;

beforeEach(async () => {
    let result = await db.query(`
    INSERT INTO books (isbn, amazon_url, author, language, pages, publisher, title, year)
    VALUES (
        '123456789',
        'https://amazon.com/hello',
        'Tester McTesterson',
        'English',
        103,
        'Fake Publishers',
        'Testing the Tester',
        2013)
    RETURNING isbn`)

    isbn = result.rows[0].isbn
});

afterEach(async () => {
    await db.query(`DELETE FROM books`);
});

afterAll(async () => {
    await db.end()
});


describe("POST /books", function() {
    test("Create new book", async () => {
        const res = await request(app).post("/books")
            .send({
                isbn: "987654321",
                amazon_url: "https://amazon.com/book",
                author: "Nobody Person",
                language: "English",
                pages: 400,
                publisher: "Test Publisher",
                title: "What it is like being someone",
                year: 2018 
            });
        expect(res.body.book).toHaveProperty("isbn");
        expect(res.statusCode).toBe(201);
    });

    test("Preventing creating a book with missing db requirements", async () => {
        const res = await request(app).post("/books")
            .send({
                author: "testing",
                year: 2014
            });
        expect(res.statusCode).toBe(400);
    });
});

describe("GET /books", function() {
    test("Get all books which is 1 book", async () => {
        const res = await request(app).get("/books");
        expect(res.body.books).toHaveLength(1);
        expect(res.body.books[0]).toHaveProperty("isbn");
        expect(res.body.books[0]).toHaveProperty("publisher");
    });
});

describe("GET /books/:isbn", function() {
    test("Get book with specific isbn", async () => {
        const res = await request(app).get(`/books/${isbn}`);
        expect(res.body.book).toHaveProperty("isbn");
        expect(res.body.book).toHaveProperty("publisher");
        expect(res.body.book.author).toBe("Tester McTesterson");
    });

    test("Get a 404 if isbn is not found", async () => {
        const res = await request(app).get("/books/99999999");
        expect(res.statusCode).toBe(404);
    })
});

describe("PUT /books/:isbn", function() {
    test("Update book with specific isbn", async () => {
        const res = await request(app).put(`/books/${isbn}`)
            .send({
                amazon_url: "https://amazon.com/booky",
                author: "Nobody Personton",
                language: "English",
                pages: 440,
                publisher: "Test Publisher Inc.",
                title: "What it is like being someone?",
                year: 2017
            });
        expect(res.body.book).toHaveProperty("isbn");
        expect(res.body.book.author).toBe("Nobody Personton");
        expect(res.body.book.pages).toBe(440);
    });

    test("Reject book update if user tries to change isbn", async () => {
        const res = await request(app).put(`/books/${isbn}`)
            .send({
                isbn: "99999999999",
                amazon_url: "https://amazon.com/booky",
                author: "Nobody Personton",
                language: "English",
                pages: 440,
                publisher: "Test Publisher Inc.",
                title: "What it is like being someone?",
                year: 2017
            });
        expect(res.statusCode).toBe(400);
        expect(res.body.message).toBe("Cannot change isbn");
    })
});

describe("DELETE /books/:isbn", function() {
    test("Delete a book", async () => {
        const res = await request(app).delete(`/books/${isbn}`);
        expect(res.body.message).toBe("Book deleted");
    });
});