import express from "express";
import bodyParser from "body-parser";
import {MongoClient, ServerApiVersion} from "mongodb";
import {google} from "googleapis";
import {SpacesServiceClient} from "@google-apps/meet";
import fs from "fs/promises";
import process from "process";
import session from "express-session";

const uri = "mongodb+srv://shkliarskyiak22:cUxy5UCHUFa682w9@cluster0.dxx1ytg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

function currentDate(){
  const ctDate = new Date();
  const timezoneOffsetInMinutes = ctDate.getTimezoneOffset();
  ctDate.setMinutes(ctDate.getMinutes() - timezoneOffsetInMinutes);
  const currentDate = ctDate.toISOString().slice(0,13) + ":00";
  return currentDate;  
}

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

let credentials;

async function getCredentials(){
 
  await client.connect();

  const user = await client.db().collection('user');
 
  const content = await user.findOne({checkfield: "hgGHGjghgda6HGF"});

  credentials = content.credentials;
}

async function createEvent(nameEv, descriptionEv, startTimeEv, endTimeEv, email) {

    await getCredentials();
    const { client_id, client_secret, redirect_uris } = credentials.installed || credentials.web;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    const tokenData = await fs.readFile(TOKEN_PATH, 'utf8');
    const token = JSON.parse(tokenData);
    oAuth2Client.setCredentials(token);

    const calendarId = await getCalenId(email);

    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

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

    return new Promise((resolve, reject) => {
      calendar.events.insert({
        calendarId: calendarId,
        resource: event,
      }, (err, event) => {
        if (err) {
          console.error('Error creating event:', err);
          reject(err);
        } else {
          const eventLink = event.data.htmlLink;
          console.log('Event created:', eventLink);
          resolve(eventLink);
        }
      });
    });
}

async function createSpace(token) {

  await getCredentials();
  const { client_id, client_secret, redirect_uris } = credentials.installed || credentials.web;

  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  oAuth2Client.setCredentials(token);
  const meetClient = new SpacesServiceClient({
    authClient: oAuth2Client
  });
  // Construct request
  const request = {
  };

  // Run request
  const response = await meetClient.createSpace(request);
  console.log(`Meet URL: ${response[0].meetingUri}`);
  // console.log(response[0].meetingCode);
  return response[0];
}

async function findEvent(tecMail){
  try {
    await client.connect();

    const user = client.db().collection('user');
    const lg = await user.findOne({email: tecMail});
  
    const tokens = lg.token;

    await getCredentials();
    const { client_id, client_secret, redirect_uris } = credentials.installed || credentials.web;

    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    oAuth2Client.setCredentials(tokens);

    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
    const calendarId = await getCalenId(tecMail);
    let response = await calendar.events.list({
        calendarId: calendarId
    });

    let eventId = await response.data.items.map(event => event.id);
    let endTimeEv = await response.data.items.map(event => event.end.dateTime);
    for (let i = 0; i < endTimeEv.length; i++) {
      const changedTimeEv = new Date(endTimeEv[i]);
      endTimeEv[i] = new Date(changedTimeEv.getTime() + 180 * 60000).toISOString().replace(/\.\d+/, '');
    }

    for (let i = 0; i < eventId.length; i++) {

      const date = new Date(endTimeEv[i]);
      const curDate = new Date(currentDate());

      if (curDate > date) {
        await calendar.events.delete({
          calendarId: calendarId,
          eventId: eventId[i],
        });
        console.log("Подію з ід: " + eventId + " видалено")
      }
    }

    response = await calendar.events.list({
      calendarId: calendarId
    });
 
    response = response.data.items.filter(data => data.colorId != 9);

    return response;

  } catch (err) {
      console.error('Error reading files:', err);
  }
}

async function updateEvent(evId, tecMail, eventId, nameEv, userMail, startTimeEv, endTimeEv){
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

    const linkMeet = await createSpace(tokens);

    console.log("1 " + linkMeet);

    console.log("2 " + linkMeet.activeConference);

    console.log("3 " + linkMeet.config);

    const requestId = linkMeet.meetingCode;

    console.log("4 " + requestId);

    const updatedEventData = {
      "summary": "Заброньований час",
      "description": `Пошта студента: ${userMail}\nПосилання на Google Meet: ${linkMeet.meetingUri}`,
      "colorId": 9,
      "start": { 
        "dateTime": changedStartTimeDate,
        "timeZone": "Europe/Kiev"
      },
      "end": { 
        "dateTime": startTimeUpdateEv,
        "timeZone": "Europe/Kiev"
      },
      "conferenceData": {
        "createRequest": {
          "requestId": requestId,
          "conferenceSolutionKey": {
            "type": "hangoutsMeet"
          }
        }
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

    const eventLink = await new Promise((resolve, reject) => {
      calendar.events.update({
        calendarId: calendarId,
        eventId: evId,
        requestBody: updatedEventData
      }, (err, event) => {
        if (err) {
          console.error('Error updating event:', err);
          reject(err);
        } else {
          const eventLink = event.data.htmlLink;
          console.log('Event updated:', eventLink);
          resolve(eventLink);
        }
      });
    });

    if (endTimeUpdateEv != startTimeUpdateEv) {
      calendar.events.insert({
        calendarId: calendarId,
        resource: event,
      });
    }
    return eventLink;
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
    calendarId: null,
    token: null

  });
  
}

async function checkInfo(email1,pass1){

  await client.connect();

  const user = client.db().collection('user');
  let lg = await user.findOne({email: email1, pass: pass1});

  if (lg != null) {
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
  if (surname == "Усіх") {
    lg = await user.find({ orient: "t"}).toArray();
    lg = lg.filter(user => user.orient != "s");

  }else if (name == "") {
    lg = await user.find({ surname: { $regex: surname.toString(), $options: 'i' } }).toArray();
    lg = lg.filter(user => user.orient != "s");
    
  }else{
    lg = await user.find({ surname: { $regex: surname.toString(), $options: 'i' }, name: { $regex: name.toString(), $options: 'i'} }).toArray();
    lg = lg.filter(user => user.orient != "s");
  }

  await client.close();
  return lg;
}

async function getOrient(email){

  if (email != null) {
    await client.connect();

    const user = client.db().collection('user');
    let lg = await user.findOne({email: email});

    const Orin = lg.orient;
    return Orin;
  } else {
    return null;
  }
}

function formatDate(dateString) {
  // Parse the input date string to a Date object
  const date = new Date(dateString);

  // Define an array with month names in Ukrainian
  const months = [
    "січня", "лютого", "березня", "квітня", "травня", "червня",
    "липня", "серпня", "вересня", "жовтня", "листопада", "грудня"
  ];

  // Extract the individual components from the Date object
  const hours = date.getUTCHours().toString().padStart(2, '0');
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');
  const day = date.getUTCDate().toString().padStart(2, '0');
  const month = months[date.getUTCMonth()];
  const year = date.getUTCFullYear();

  // Construct the formatted date string
  return `${hours}:${minutes} ${day} ${month} ${year}`;
}

async function setCalenId(oAuth2Client, tokens, email){

  await client.connect();

  const user = client.db().collection('user');

  const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

    const newCalendar = await calendar.calendars.insert({
      requestBody: {
        summary: 'Час для бронювання',
        description: ''
      }
    });

    const calendarId = newCalendar.data.id;

    await user.updateOne(
      {email: email},
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

app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true
}));

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"))

app.get("/", async (req, res) => {
    res.render("home.ejs")
})
app.get("/home.ejs", async (req, res) => {
  res.render("home.ejs");
})
app.get("/login.ejs", async (req, res) => {
    res.render("login.ejs",{wrngMess: ""})
})
app.get("/registration.ejs", async (req, res) => {
    res.render("registration.ejs");
})

app.post("/login", async (req, res) => {

    const email = req.body.email;
    const password = req.body.password;
    
    if (await checkInfo(email,password) == true) {
      res.redirect("oAuth.ejs");
    } else {
      res.render("login.ejs",{wrngMess: "Wrong email or password"});
    }

})
app.post("/registration", async (req, res) => {  

    const surname = req.body.surname;
    const name = req.body.name;
    const nameF = req.body.nameF;
    const email = req.body.email;
    const password = req.body.password;
    const orient = req.body.ts;

    regster(surname, name, nameF, email, password, orient);
    const authUrl = await generateAuthUrl();
    res.redirect(authUrl);

})

app.get("/oAuth.ejs", async (req, res) => {
  const email = req.query.data;

  if (email == null) {
    const code = req.query.code;
    res.render("oAuth.ejs", {code : code})
  }else{
   
    const Orin = await getOrient(email);

    res.json({ Orin });

    try {
      const code = req.query.code;

      await getCredentials();
      const { client_id, client_secret, redirect_uris } = credentials.installed || credentials.web;

      const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris);
      
      const { tokens } = await oAuth2Client.getToken(code);
      oAuth2Client.setCredentials(tokens);

      await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens));
  
      await setCalenId(oAuth2Client, tokens, email);

      res.redirect("home.ejs");
    } catch (error) {
      if (Orin == "t") {
        refreshToken(email);
      }
      res.render("home.ejs");
    }
  }
})

app.get("/student.ejs", async (req, res) => {
  res.render("student.ejs", {
    wrngMess: "", 
    userMail: null,
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

  const lg = await findTeacher(surname, name);

  const arraySurname = await lg.map(lg => lg.surname);
  const arrayName = await lg.map(lg => lg.name);
  const arrayMail = await lg.map(lg => lg.email);

  let wrngMess;

  if (lg == "") {
    wrngMess = "false"
  }else{
    wrngMess = "";
  }

  res.render("student.ejs", {
    wrngMess: wrngMess, 
    userMail: null,
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
  req.session.tecMail = req.body.tecMail;

  res.redirect("/studentCalendar.ejs");
})
app.get("/studentCalendar.ejs", async (req, res) => {

  let tecMail = req.session.tecMail;

  if (tecMail == undefined) {
    tecMail = "";

    res.render("studentCalendar.ejs", {
      userMail: "",
      arrayEvId: "",
      arraySum: "",
      arrayStartTime: "",
      arrayEndTime: ""
      
    });

  }else{
    let response;
    try {
      response = await findEvent(tecMail);
    } catch (error) {
      await refreshToken(tecMail);
      response = await findEvent(tecMail);
    }
  
    let eventId = await response.map(event => event.id);
  
    let nameEv = await response.map(event => event.summary);
    let startTimeEv = await response.map(event => event.start.dateTime);
    for (let i = 0; i < startTimeEv.length; i++) {
      const changedTimeEv = new Date(startTimeEv[i]);
      startTimeEv[i] = new Date(changedTimeEv.getTime() + 180 * 60000).toISOString().replace(/\.\d+/, '');
      startTimeEv[i] = formatDate(startTimeEv[i]);
    }
  
    let endTimeEv = await response.map(event => event.end.dateTime);
    for (let i = 0; i < endTimeEv.length; i++) {
      const changedTimeEv = new Date(endTimeEv[i]);
      endTimeEv[i] = new Date(changedTimeEv.getTime() + 180 * 60000).toISOString().replace(/\.\d+/, '');
      endTimeEv[i] = formatDate(endTimeEv[i]);
    }
    const bMail = btoa(await getCalenId(tecMail)).replace(/=+$/, '');

    res.render("studentCalendar.ejs", {
      userMail: bMail,
      arrayEvId: eventId,
      arraySum: nameEv,
      arrayStartTime: startTimeEv,
      arrayEndTime: endTimeEv
      
    });
  
  }

})
app.post("/student-cal", async (req, res) => {

  const tecMail = req.session.tecMail;

  const userMail= req.body.email;

  const evId = req.body.tecEvent;

  let response = await findEvent(tecMail);

  let eventId = await response.map(event => event.id);
  
  let nameEv = await response.map(event => event.summary);

  let startTimeEv = await response.map(event => event.start.dateTime);
    for (let i = 0; i < startTimeEv.length; i++) {
      const changedTimeEv = new Date(startTimeEv[i]);
      startTimeEv[i] = new Date(changedTimeEv.getTime() + 180 * 60000).toISOString().replace(/\.\d+/, '');
    }
  
  let endTimeEv = await response.map(event => event.end.dateTime);
    for (let i = 0; i < endTimeEv.length; i++) {
      const changedTimeEv = new Date(endTimeEv[i]);
      endTimeEv[i] = new Date(changedTimeEv.getTime() + 180 * 60000).toISOString().replace(/\.\d+/, '');
    }
  console.log(userMail);
  const eventLink = await updateEvent(evId, tecMail, eventId, nameEv, userMail, startTimeEv, endTimeEv);
  req.session.eventLink = eventLink;
  req.session.message = "Час успішно заброньовано!";

  res.redirect("/successmessage.ejs");
})

app.get("/teacher.ejs", async (req, res) => {
    const curDate = currentDate();
    res.render("teacher.ejs", {
    wrngMess: "",
    minTime: curDate
    }
  );
})

app.get("/privacy.ejs", async (req, res) => {
  res.render("privacy.ejs");
})

app.get("/termsService.ejs", async (req, res) => {
  res.render("termsService.ejs");
})

app.post("/teacher", async (req, res) => {

  const nameEv = req.body.evName;
  const descriptionEv = req.body.evDescr;
  const startTimeEv = req.body.evDateSt + ":00"; 
  const endTimeEv = req.body.evDateEn + ":00";
  const email = req.body.email;
  let eventLink;

  const stT = new Date(req.body.evDateSt);
  const enT = new Date(req.body.evDateEn);
  const curDate = currentDate();

  if(stT>=enT){
    res.render("teacher.ejs",{wrngMess: "Кінцевий час мусить бути більший ніж початковий", minTime: curDate})
  }else{
    try {
      eventLink = await createEvent(nameEv, descriptionEv, startTimeEv, endTimeEv, email);
    } catch (error) {
      await refreshToken(email);
      eventLink = await createEvent(nameEv, descriptionEv, startTimeEv, endTimeEv, email);
    }
      req.session.eventLink = eventLink;
      req.session.message = "Подію створено успішно!";

      res.redirect("/successmessage.ejs");
  }

})

app.get("/successmessage.ejs", async (req, res) => {

  const link = req.session.eventLink;
  const message = req.session.message;

  res.render("successmessage.ejs",{message: message, eventLink: link});
})
app.listen(port, "0.0.0.0", () => {
    console.log(`Server running on port ${port}.`)
})