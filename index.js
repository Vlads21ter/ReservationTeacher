import express from "express";
import bodyParser from "body-parser";
import mongodb from "mongodb";
// const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://shkliarskyiak22:L21vlads00@cluster0.jiowjli.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server (optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}
run().catch(console.dir);

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"))

app.get("/", (req, res) => {
    res.render("home.ejs")
})
app.get("/home.ejs", (req, res) => {
    res.render("home.ejs")
})
app.get("/info.ejs", (req, res) => {
    res.render("info.ejs")
})
app.get("/login.ejs", (req, res) => {
    res.render("login.ejs")
})
app.get("/registration.ejs", (req, res) => {
    res.render("registration.ejs")
})

app.post("/login", async (req, res) => {
    const email = req.body.email;
    const password = req.body.password;
    
})
app.post("/registration", async (req, res) => {
    const email = req.body.email;
    const password = req.body.password;
    
})
app.get("/student.ejs", (req, res) => {
    res.render("student.ejs")
})
app.get("/teacher.ejs", (req, res) => {
    res.render("teacher.ejs")
})
app.listen(port, () => {
    console.log(`Server running on port ${port}.`)
})