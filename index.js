import express from "express";
import bodyParser from "body-parser";
import {MongoClient, ServerApiVersion} from "mongodb";
import {google} from "googleapis";
import fs from "fs/promises";
import path from "path";
import process from "process";

const calendar = google.calendar('v3');

const projectId = 'restec-419316';

const uri = "mongodb+srv://shkliarskyiak22:pass@cluster0.jiowjli.mongodb.net/ReservDb?retryWrites=true&w=majority&appName=Cluster0";

let mainMail;
let mainId;

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


// Параметри автентифікації
const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const TOKEN_PATH = 'token.json'; // файл для зберігання токенів
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

// Автентифікація та отримання доступу до Google Календаря
async function authenticate(callback) {
  try {
      const credentialsData = await fs.readFile(CREDENTIALS_PATH);
      const credentials = JSON.parse(credentialsData);

      const { client_id, client_secret, redirect_uris } = credentials.installed || credentials.web;

      const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

      const tokenData = await fs.readFile(TOKEN_PATH, 'utf8');
      const token = JSON.parse(tokenData);
      oAuth2Client.setCredentials(token);

      callback(oAuth2Client);
  } catch (err) {
      console.error('Error reading files:', err);
  }
}

// Створення події в Google Календарі
function createEvent(auth) {
    const calendar = google.calendar({ version: 'v3', auth });

    const event = {
        'summary': 'Test Event',
        'description': 'This is a test event',
        'start': {
            'dateTime': '2024-04-10T10:00:00',
            'timeZone': 'America/New_York',
        },
        'end': {
            'dateTime': '2024-04-10T11:00:00',
            'timeZone': 'America/New_York',
        },
    };

    calendar.events.insert({
        calendarId: 'primary',
        resource: event,
    }, (err, event) => {
        if (err) {
            console.error('Error creating event:', err);
            return;
        }
        console.log('Event created:', event.data.htmlLink);
    });
}

// const event = {
//   'summary': 'Google I/O 2015',
//   'location': '',
//   'description': 'A chance to hear more about Google\'s developer products.',
//   'start': {
//     'dateTime': '2024-04-06T09:00:00-07:00',
//     'timeZone': 'Ukraine/Kiev',
//   },
//   'end': {
//     'dateTime': '2024-04-06T17:00:00-07:00',
//     'timeZone': 'Ukraine/Kiev',
//   },
//   'recurrence': [
//     'RRULE:FREQ=DAILY;COUNT=2'
//   ],
//   'attendees': [
//     {'email': 'lpage@example.com'},
//     {'email': 'sbrin@example.com'},
//   ],
//   'reminders': {
//     'useDefault': false,
//     'overrides': [
//       {'method': 'email', 'minutes': 24 * 60},
//       {'method': 'popup', 'minutes': 10},
//     ],
//   },
// };

const content = await fs.readFile(CREDENTIALS_PATH);
const credentials = JSON.parse(content);
const { client_id, client_secret, redirect_uris } = credentials.installed || credentials.web;

  function generateAuthUrl() {
  console.log(client_id);
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris);

  const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      client_id: client_id,
      redirect_uri: redirect_uris
  });

  return authUrl;
}

async function regster(email, pass, orient){

  await client.connect();
  const user = client.db().collection('user');

  mainMail=email;

  await user.insertOne({
    email: email,
    pass: pass,
    orient: orient
  });

  mainId = await user.findOne({email: email})._id;
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
app.get("/home.ejs", async (req, res) => {
    
    try {
      const code = req.query.code;
      const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris);

      const { tokens } = await oAuth2Client.getToken(code);
      oAuth2Client.setCredentials(tokens);

      // Save the token to disk
      await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens));

      res.render("home.ejs");
  } catch (error) {
      console.error('Error while handling OAuth2 callback:', error);
      res.status(500).send('Error while handling OAuth2 callback');
  }

    // calendar.events.insert({
    //   auth: authorizationUrl,
    //   calendarId: 'shkliarskyi_ak22@nuwm.edu.ua',
    //   resource: event,
    // }, function(err, event) {
    //   if (err) {
    //     console.log('There was an error contacting the Calendar service: ' + err);
    //     return;
    //   }
    //   console.log('Event created: %s', event.htmlLink);
    // });

})
app.get("/info.ejs", (req, res) => {
  res.render("info.ejs");
})
app.get("/login.ejs", (req, res) => {
    res.render("login.ejs",{wrngMess: ""})
})
app.get("/registration.ejs", (req, res) => {
    res.render("registration.ejs");
    // authenticate(createEvent);
    console.log("ok");
})

app.post("/login", async (req, res) => {

    const email = req.body.email;
    const password = req.body.password;
    
    if (await checkInfo(email,password) == true) {
      res.render("login.ejs",{wrngMess: ""})
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
    var bMail = btoa(mainMail).replace(/=+$/, '');
    res.render("student.ejs", { userMail: bMail})
})
app.get("/teacher.ejs", (req, res) => {
    // res.render("teacher.ejs");
    const authUrl = generateAuthUrl();
    console.log(authUrl);
    res.redirect(authUrl);
})
app.listen(port, () => {
    console.log(`Server running on port ${port}.`)
})