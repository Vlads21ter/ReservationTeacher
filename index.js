import express from "express";
import bodyParser from "body-parser";
import {MongoClient, ServerApiVersion} from "mongodb";

const uri = "mongodb+srv://shkliarskyiak22:cUxy5UCHUFa682w9@cluster0.jiowjli.mongodb.net/ReservDb?retryWrites=true&w=majority&appName=Cluster0";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri,
  {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }}
  );

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
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

async function regster(email, pass, orient){
  await client.connect();
  const user = client.db().collection('user');
  await user.insertOne({
    email: email,
    pass: pass,
    orient: orient
  });
}

async function checkInfo(email1,pass1){

  await client.connect();
  const user = client.db().collection('user');
  let lg = await user.findOne({email: email1, pass: pass1});
  if (lg != null) {
    return true;
  } else {
    return false;
  }
}


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
    // console.log(await checkInfo(email,password));
    
    if (await checkInfo(email,password) == true) {
      res.send("You login!");
    } else {
      res.send("Wrong email or password");
      // console.log(checkInfo(email,password));
    }
})
app.post("/registration", async (req, res) => {
    const email = req.body.email;
    const password = req.body.password;
    const orient = req.body.ts;
    regster(email, password, orient);
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