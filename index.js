import express from "express";
import bodyParser from "body-parser";
import {MongoClient, ServerApiVersion} from "mongodb";
import {google} from "googleapis";
import fs from "fs/promises";
import path from "path";
import process from "process";

import { v4 as uuidv4 } from "uuid";

const requestId = uuidv4(); // Створення унікального ідентифікатора

const uri = "";

let mainMail;
let mainId;
let mainOrin;

let calendarId;
let nameEv;
let descriptionEv;
let startTimeEv; 
let endTimeEv;

let arraySurname;
let arrayName;
let arrayMail;

const ctDate = new Date();
const timezoneOffsetInMinutes = ctDate.getTimezoneOffset();
ctDate.setMinutes(ctDate.getMinutes() - timezoneOffsetInMinutes);
const currentDate = ctDate.toISOString().slice(0,13) + ":00";



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
const SCOPES = ['https://www.googleapis.com/auth/calendar','https://www.googleapis.com/auth/meetings.space.created'];
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
      "summary": nameEv,
      "description": descriptionEv,
      "colorId": "11",
      "extendedProperties": {
        "private": {
          "tags": "Reserv",
        },
      },
      "start": {
        "dateTime": startTimeEv,
        "timeZone": "Europe/Kiev",
      },
      "end": {
        "dateTime": endTimeEv,
        "timeZone": "Europe/Kiev",
      },
      "conferenceData": {
        "createRequest": {
          "requestId": "uox-dhbk-knm",
          "conferenceSolutionKey": {
            "type": "hangoutsMeet",
          },
        },
        "status": "confirmed",
      },
      "conferenceDataVersion": "3",
      "visibility": "public",
    };

    calendar.events.insert({
        calendarId: calendarId,
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
//   'attendees': [ //присутні
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
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris);

  const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      client_id: client_id,
      redirect_uri: redirect_uris
  });

  return authUrl;
}

async function regster(surname, name, nameF, email, pass, orient){

  await client.connect();
  const user = client.db().collection('user');

  await user.insertOne({

    surname: surname,
    name: name,
    nameF: nameF,
    email: email,
    pass: pass,
    orient: orient,
    calendarId: calendarId,
    cd: client_id,
    lc: client_secret,
    di: redirect_uris

  });
  
  mainId = await user.findOne({email: email})._id;
  
}

async function checkInfo(email1,pass1){

  await client.connect();

  const user = client.db().collection('user');
  let lg = await user.findOne({email: email1, pass: pass1});

  if (lg != null) {
    mainMail = lg.email;
    mainId = lg._id;
    mainOrin = lg.orient;
    calendarId = lg.calendarId;
    await client.close();
    return true;
  } else {
    await client.close();
    return false;
  }
}

async function findTeacher(surname , name){

  await client.connect();

  const user = client.db().collection('user');

  let lg;
  if (name == "") {
    lg = await user.find({ surname: { $regex: surname.toString(), $options: 'i' } }).toArray();

    arraySurname = await lg.map(lg => lg.surname);
    arrayName = await lg.map(lg => lg.name);
    arrayMail = await lg.map(lg => lg.email);
  }else{
    lg = await user.find({ surname: { $regex: surname.toString(), $options: 'i' }, name: { $regex: name.toString(), $options: 'i'} }).toArray();
    arraySurname = await lg.map(lg => lg.surname);
    arrayName = await lg.map(lg => lg.name);
    arrayMail = await lg.map(lg => lg.email);
  }
  
  if (lg != null) {
    await client.close();
    return lg;
  } else {
    await client.close();
  }
}

async function setCalenId(oAuth2Client){

  await client.connect();

  const user = client.db().collection('user');

  const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

    const newCalendar = await calendar.calendars.insert({
      requestBody: {
        summary: 'Час для бронювання',
        description: ''
      }
    });

    calendarId = newCalendar.data.id;

    await user.updateOne(
      {email: mainMail},
      {$set:{calendarId: calendarId}}
    );

    await calendar.acl.insert({
      calendarId: calendarId,
      requestBody: {
        role: 'reader',
        scope: {
          type: 'default'
        }
      }
    });  
    console.log("Calendar was created.");
    await client.close();
}

async function getCalenId(mail){
  await client.connect();

  const user = client.db().collection('user');
  const lg = await user.findOne({email: mail});

  return lg.calendarId;
}

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"))

app.get("/", (req, res) => {
    res.render("home.ejs", { or: mainOrin})
})
app.get("/home.ejs", async (req, res) => {
  res.render("home.ejs", { or: mainOrin});
})
app.get("/login.ejs", (req, res) => {
    res.render("login.ejs",{wrngMess: "",or: mainOrin})
})
app.get("/registration.ejs", (req, res) => {
    res.render("registration.ejs", { or: mainOrin});
})

app.post("/login", async (req, res) => {

    const email = req.body.email;
    const password = req.body.password;
    
    if (await checkInfo(email,password) == true) {
      const authUrl = generateAuthUrl();
      res.redirect(authUrl);
    } else {
      res.render("login.ejs",{wrngMess: "Wrong email or password", or: mainOrin});
    }

})
app.post("/registration", async (req, res) => {  

    const surname = req.body.surname;
    const name = req.body.name;
    const nameF = req.body.nameF;
    const email = req.body.email;
    const password = req.body.password;
    const orient = req.body.ts;
    mainMail=email;
    mainOrin=orient;

    regster(surname, name, nameF, email, password, orient);
    // console.log(mainMail);
    const authUrl = generateAuthUrl();
    res.redirect(authUrl);

})
app.get("/oAuth.ejs", async (req, res) => {
    
  try {
    const code = req.query.code;
    console.log(code);
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris);

    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);

    // Save the token to disk
    await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens));

    setCalenId(oAuth2Client);
    //Додати затримку
    await res.render("oAuth.ejs", { or: mainOrin});
} catch (error) {
    console.error('Error while handling OAuth2 callback:', error);
    res.status(500).send('Error while handling OAuth2 callback');
}

})

app.get("/student.ejs", async (req, res) => {

  res.render("student.ejs", {
    wrngMess: "", 
    userMail: "", 
    or: mainOrin,
    arraySurname: "", 
    arrayName: "", 
    arrayMail: ""
});
})


app.post("/student", async (req, res) => {

  const surname = req.body.vsName;
  const name = req.body.vName;

  await findTeacher(surname, name);

  res.render("student.ejs", {
    wrngMess: "", 
    userMail: "", 
    or: mainOrin,
    arraySurname: arraySurname,
    arrayName: arrayName,
    arrayMail: arrayMail
  });
})
app.post("/student-tec", async (req, res) => {

  const tecMail = req.body.tecMail;

  var bMail = btoa(await getCalenId(tecMail)).replace(/=+$/, '');
  res.render("student.ejs", {
    wrngMess: "", 
    userMail: bMail, 
    or: mainOrin,
    arraySurname: arraySurname,
    arrayName: arrayName,
    arrayMail: arrayMail
  });
})
app.get("/teacher.ejs", (req, res) => {
    res.render("teacher.ejs", {wrngMess: "", or: mainOrin, minTime: currentDate
  });
})
app.post("/teacher", async (req, res) => {

  nameEv = req.body.evName;
  descriptionEv = req.body.evDescr;
  startTimeEv = req.body.evDateSt + ":00"; 
  endTimeEv = req.body.evDateEn + ":00";

  const stT = new Date(req.body.evDateSt);
  const enT = new Date(req.body.evDateEn);

  if(stT>=enT){
    res.render("teacher.ejs",{wrngMess: "Кінцевий час мусить бути більший ніж початковий", or: mainOrin, minTime: currentDate})
  }else{
    authenticate(createEvent);

    res.render("teacher.ejs",{wrngMess: "", or: mainOrin, minTime: currentDate})
  }

  
})
app.listen(port, () => {
    console.log(`Server running on port ${port}.`)
})