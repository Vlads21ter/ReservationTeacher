import express from "express";
import bodyParser from "body-parser";
import {MongoClient, ServerApiVersion} from "mongodb";
import {google} from "googleapis";
import fs from "fs/promises";
import path from "path";
import process from "process";

const uri = "mongodb+srv://shkliarskyiak22:cUxy5UCHUFa682w9@cluster0.dxx1ytg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

let mainMail;
let mainId;
let mainOrin;
let token;
let tecMail;

let calendarId;
let eventId;
let colorId;
let nameEv;
let descriptionEv;
let startTimeEv; 
let endTimeEv;

let arraySurname;
let arrayName;
let arrayMail;
let arrayOrient;

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
const TOKEN_PATH = 'token.json';
// const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

// const credentialsData = await fs.readFile(CREDENTIALS_PATH);
// const credentials = JSON.parse(credentialsData);

let credentials;

async function getCredentials(){
 
  await client.connect();

  const user = await client.db().collection('user');
 
  const content = await user.findOne({checkfield: "hgGHGjghgda6HGF"});

  credentials = content.credentials;
}
// Автентифікація та отримання доступу до Google Календаря
async function authenticate(callback) {
  try {
      await getCredentials();
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

async function findEvent(){
  try {
    await client.connect();

    const user = client.db().collection('user');
    const lg = await user.findOne({email: tecMail});
  
    const tokens = lg.token;
    await client.close();

    await getCredentials();
    const { client_id, client_secret, redirect_uris } = credentials.installed || credentials.web;

    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    oAuth2Client.setCredentials(tokens);

    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
    const calendarId = await getCalenId(tecMail);
    const response = await calendar.events.list({
        calendarId: calendarId
    });

    eventId = await response.data.items.map(event => event.id);
    endTimeEv = await response.data.items.map(event => event.end.dateTime);
    for (let i = 0; i < endTimeEv.length; i++) {
      const changedTimeEv = new Date(endTimeEv[i]);
      endTimeEv[i] = new Date(changedTimeEv.getTime() + 180 * 60000).toISOString().replace(/\.\d+/, '');
    }

    for (let i = 0; i < eventId.length; i++) {

      const date = new Date(endTimeEv[i]);
      const curDate = new Date(currentDate);

      if (curDate > date) {
        await calendar.events.delete({
          calendarId: calendarId,
          eventId: eventId[i],
        });
        console.log("Подію з ід: " + eventId + " видалено")
      }
    }

    eventId = await response.data.items.map(event => event.id);
    nameEv = await response.data.items.map(event => event.summary);
    colorId = await response.data.items.map(event => event.colorId);

    startTimeEv = await response.data.items.map(event => event.start.dateTime);
    for (let i = 0; i < startTimeEv.length; i++) {
      const changedTimeEv = new Date(startTimeEv[i]);
      startTimeEv[i] = new Date(changedTimeEv.getTime() + 180 * 60000).toISOString().replace(/\.\d+/, '');
    }
    
    endTimeEv = await response.data.items.map(event => event.end.dateTime);
    for (let i = 0; i < endTimeEv.length; i++) {
      const changedTimeEv = new Date(endTimeEv[i]);
      endTimeEv[i] = new Date(changedTimeEv.getTime() + 180 * 60000).toISOString().replace(/\.\d+/, '');
    }

    for (let i = 0; i < colorId.length; i++) {
      if (colorId[i] == 9) {
        eventId.splice(i,1);
        nameEv.splice(i,1);
        colorId.splice(i,1);
        startTimeEv.splice(i,1);
        endTimeEv.splice(i,1);
        i = i - 1;
      }
    }

  } catch (err) {
      console.error('Error reading files:', err);
  }
}

async function updateEvent(evId){
  try {
    let num;
    for (let i = 0; i < eventId.length; i++) {
      if (eventId[i] == evId) {
        num = i;
      }
    }
    await client.connect();

    const user = client.db().collection('user');
    const lg = await user.findOne({email: tecMail});

    const tokens = lg.token;
    const calendarId = await getCalenId(tecMail);

    await getCredentials();
    const { client_id, client_secret, redirect_uris } = credentials.installed || credentials.web;

    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    oAuth2Client.setCredentials(tokens);

    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

    const startTime = new Date(startTimeEv[num]);
    const changedStartTimeDate = new Date(startTime.getTime() - 180 * 60000);

    const endTime = new Date(endTimeEv[num]);
    const endTimeDate = new Date(endTime.getTime() - 180 * 60000);

    const startTimeDate = new Date(changedStartTimeDate.getTime() + 30 * 60000);

    const startTimeUpdateEv = startTimeDate.toISOString().replace(/\.\d+/, '');

    const endTimeUpdateEv = endTimeDate.toISOString().replace(/\.\d+/, '');

    const updatedEventData = {
      "summary": "Заброньований час",
      "description": mainMail,
      "colorId": 9,
      "start": { 
        "dateTime": changedStartTimeDate,
        "timeZone": "Europe/Kiev"
      },
      "end": { 
        "dateTime": startTimeUpdateEv,
        "timeZone": "Europe/Kiev"
      } 
    };

    const event = {
      "summary": nameEv[num],
      "colorId": 11,
      "start": { 
        "dateTime": startTimeUpdateEv,
        "timeZone": "Europe/Kiev"
      },
      "end": { 
        "dateTime": endTimeUpdateEv ,
        "timeZone": "Europe/Kiev"
      } 
    };

    await calendar.events.update({
      calendarId: calendarId,
      eventId: evId,
      requestBody: updatedEventData
    }, (err, event) => {
      if (err) {
          console.error('Error creating event:', err);
          return;
      }
      console.log('Event created:', event.data.htmlLink);
    });

    if (endTimeUpdateEv != startTimeUpdateEv) {
      calendar.events.insert({
        calendarId: calendarId,
        resource: event,
      });
    }
    
  } catch (err) {
      console.error('Error update event:', err);
  }
}

async function generateAuthUrl() {

  await getCredentials();
  const { client_id, client_secret, redirect_uris } = credentials.installed || credentials.web;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris);

  const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES
  });

  return authUrl;
}

async function refreshToken(email){

  await client.connect();

  const user = client.db().collection('user');
  let lg = await user.findOne({email: email});
  let tokens = lg.token;
  
  const refresh_token = tokens.refresh_token;
  const scope = tokens.scope;
  const token_type = tokens.token_type;
  const expiry_date = tokens.expiry_date;

  await getCredentials();
  const { client_id, client_secret, redirect_uris } = credentials.installed || credentials.web;

  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris);

  oAuth2Client.setCredentials({ refresh_token });

  oAuth2Client.refreshAccessToken(async (err, tokens) => {

    if (err) {
      console.error('Помилка при оновленні токену доступу:', err);
      return;
    }
    
    const accessToken = tokens.access_token;

    console.log('Оновлений токен доступу:', accessToken);

    await client.connect();

    await user.updateOne(
      {email: email},
      {
        $set:
        {
          token:{
            access_token: accessToken,
            refresh_token: refresh_token,
            scope: scope,
            token_type: token_type,
            expiry_date: expiry_date
          }
        }
      }
    );
    
    lg = await user.findOne({email: email});
    tokens = await lg.token;

    await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens));
  });  
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
    token: token

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
    token = lg.token;
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
    arrayOrient = await lg.map(lg => lg.orient);
    
  }else{
    lg = await user.find({ surname: { $regex: surname.toString(), $options: 'i' }, name: { $regex: name.toString(), $options: 'i'} }).toArray();
    arraySurname = await lg.map(lg => lg.surname);
    arrayName = await lg.map(lg => lg.name);
    arrayMail = await lg.map(lg => lg.email);
    arrayOrient = await lg.map(lg => lg.orient);
  }

  for (let i = 0; i < arrayOrient.length; i++) {
    if (arrayOrient[i] == "s") {
      arraySurname.splice(i,1);
      arrayName.splice(i,1);
      arrayMail.splice(i,1);
      arrayOrient.splice(i,1);
      i = i - 1;
    }
  }

  if (lg == "") {
    await client.close();
    return "false";
  }else{
    await client.close();
    return "";
  }
}

async function setCalenId(oAuth2Client, tokens){

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
      {
        $set:
        {
          calendarId: calendarId,
          token: tokens
        }
      }
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
const port = process.env.PORT || 3000;

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

    mainMail = null;
    mainId = null;
    mainOrin = null;
    token = null;

    const email = req.body.email;
    const password = req.body.password;
    
    if (await checkInfo(email,password) == true) {
      const authUrl = await generateAuthUrl();
      res.redirect(authUrl);
    } else {
      res.render("login.ejs",{wrngMess: "Wrong email or password", or: mainOrin});
    }

})
app.post("/registration", async (req, res) => {  

    mainMail = null;
    mainId = null;
    mainOrin = null;
    token = null;

    const surname = req.body.surname;
    const name = req.body.name;
    const nameF = req.body.nameF;
    const email = req.body.email;
    const password = req.body.password;
    const orient = req.body.ts;
    mainMail=email;
    mainOrin=orient;

    regster(surname, name, nameF, email, password, orient);
    const authUrl = await generateAuthUrl();
    res.redirect(authUrl);

})
app.get("/oAuth.ejs", async (req, res) => {

  if (mainOrin == "s" ) {
    await res.render("oAuth.ejs", { or: mainOrin});
  }else if(token == null){
    
    try {
      const code = req.query.code;

      await getCredentials();
      const { client_id, client_secret, redirect_uris } = credentials.installed || credentials.web;

      const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris);
      
      const { tokens } = await oAuth2Client.getToken(code);
      oAuth2Client.setCredentials(tokens);

      token = tokens;
      await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens));
  
      await setCalenId(oAuth2Client, tokens);

      res.render("oAuth.ejs", { or: mainOrin});
    } catch (error) {
        console.error('Error while handling OAuth2 callback:', error);
        res.status(500).send('Error while handling OAuth2 callback');
    }
  }else{
    try {
      refreshToken(mainMail);
      await res.render("oAuth.ejs", { or: mainOrin});
    } catch (error) {
        console.error('Error while handling OAuth2 callback:', error);
        res.status(500).send('Error while handling OAuth2 callback');
    }
  }
})

app.get("/student.ejs", async (req, res) => {

  res.render("student.ejs", {
    wrngMess: "", 
    userMail: "", 
    or: mainOrin,
    arraySurname: "", 
    arrayName: "", 
    arrayMail: "",
    arrayEvId: "",
    arraySum: "",
    arrayStartTime: "",
    arrayEndTime: ""
});
})


app.post("/student", async (req, res) => {

  const surname = req.body.vsName;
  const name = req.body.vName;

  const wrngMess = await findTeacher(surname, name);

  res.render("student.ejs", {
    wrngMess: wrngMess, 
    userMail: "", 
    or: mainOrin,
    arraySurname: arraySurname,
    arrayName: arrayName,
    arrayMail: arrayMail,
    arrayEvId: "",
    arraySum: "",
    arrayStartTime: "",
    arrayEndTime: ""
  });
})

app.post("/student-tec", async (req, res) => {

  tecMail = req.body.tecMail;

  try {
    await findEvent();
  } catch (error) {
    await refreshToken(tecMail);
    await findEvent();
  }

  var bMail = btoa(await getCalenId(tecMail)).replace(/=+$/, '');

  res.render("student.ejs", {
    wrngMess: "", 
    userMail: bMail, 
    or: mainOrin,
    arraySurname: arraySurname,
    arrayName: arrayName,
    arrayEvId: eventId,
    arrayMail: arrayMail,
    arraySum: nameEv,
    arrayStartTime: startTimeEv,
    arrayEndTime: endTimeEv
    
  });
})

app.post("/student-cal", async (req, res) => {

  const evId = req.body.tecEvent;

  await updateEvent(evId);
  await findEvent();

  var bMail = btoa(await getCalenId(tecMail)).replace(/=+$/, '');

  res.render("student.ejs", {
    wrngMess: "", 
    userMail: bMail, 
    or: mainOrin,
    arraySurname: arraySurname,
    arrayName: arrayName,
    arrayMail: arrayMail,
    arrayEvId: eventId,
    arraySum: nameEv,
    arrayStartTime: startTimeEv,
    arrayEndTime: endTimeEv
    
  });
})

app.get("/teacher.ejs", (req, res) => {
    res.render("teacher.ejs", {wrngMess: "", or: mainOrin, minTime: currentDate
  });
})

app.get("/privacy.ejs", (req, res) => {
  res.render("privacy.ejs");
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
app.listen(port, "0.0.0.0", () => {
    console.log(`Server running on port ${port}.`)
})
