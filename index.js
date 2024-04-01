import express from "express";
import bodyParser from "body-parser";
import {MongoClient, ServerApiVersion} from "mongodb";

const uri = "mongodb+srv://shkliarskyiak22:cUxy5UCHUFa682w9@cluster0.jiowjli.mongodb.net/ReservDb?retryWrites=true&w=majority&appName=Cluster0";

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
    
    await client.connect();
    
    await client.db("admin").command({ ping: 1 });
  
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    await client.close();
  }
}
run().catch(console.dir);

let mainMail;
let mainId;

async function regster(email, pass, orient){

  await client.connect();
  const user = client.db().collection('user');

  await user.insertOne({
    email: email,
    pass: pass,
    orient: orient
  });
  await client.close();
}

async function checkInfo(email1,pass1){

  await client.connect();

  const user = client.db().collection('user');
  let lg = await user.findOne({email: email1, pass: pass1});

  if (lg != null) {
    mainMail = lg.email;
    mainId = lg._id;
    await client.close();
    return true;
  } else {
    await client.close();
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
    res.render("login.ejs",{wrngMess: ""})
})
app.get("/registration.ejs", (req, res) => {
    res.render("registration.ejs")
})

app.post("/login", async (req, res) => {

    const email = req.body.email;
    const password = req.body.password;
    
    if (await checkInfo(email,password) == true) {
      res.send("You login!");
    } else {
      res.render("login.ejs",{wrngMess: "Wrong email or password"});
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