import express from "express";
import bodyParser from "body-parser";
import {MongoClient, ServerApiVersion} from "mongodb";
import {google} from "googleapis";
import {Storage} from "@google-cloud/storage";
// import { authenticate } from "@google-cloud/local-auth";
import fs from "fs/promises";
import path from "path";
import process from "process";

const calendar = google.calendar('v3');

const projectId = 'restec-419316';

const uri = "mongodb+srv://shkliarskyiak22:cUxy5UCHUFa682w9@cluster0.jiowjli.mongodb.net/ReservDb?retryWrites=true&w=majority&appName=Cluster0";

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





import readline from 'readline';


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
      // Перевіряємо, чи властивості client_id, client_secret та redirect_uris є в об'єкті
      if (!client_id || !client_secret || !redirect_uris || !redirect_uris[0]) {
          throw new Error('Missing required properties in credentials.installed');
      }

      const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

      const tokenData = await fs.readFile(TOKEN_PATH, 'utf8');
      const token = JSON.parse(tokenData);
      oAuth2Client.setCredentials(token);

      callback(oAuth2Client);
  } catch (err) {
      console.error('Error reading files:', err);
  }
}

// Отримання нового токену доступу
async function getAccessToken(oAuth2Client, callback) {
    const credentialsData = await fs.readFile(CREDENTIALS_PATH);
    const credentials = JSON.parse(credentialsData);

    const { client_id, client_secret, redirect_uris } = credentials.installed || credentials.web;
    if (!client_id || !client_secret || !redirect_uris || !redirect_uris[0]) {
        throw new Error('Missing required properties in credentials.installed');
    }
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        include_granted_scopes: true,
        client_id: client_id,
        redirect_uri: redirect_uris
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    rl.question('Enter the code from that page here: ', (code) => {
        rl.close();
        oAuth2Client.getToken(code, async (err, token) => {
            if (err) return console.error('Error retrieving access token', err);
            oAuth2Client.setCredentials(token);
            try {
                await fs.writeFile(TOKEN_PATH, JSON.stringify(token));
                console.log('Token stored to', TOKEN_PATH);
            } catch (err) {
                console.error(err);
            }
            callback(oAuth2Client);
        });
    });
}

// Створення події в Google Календарі
function createEvent(auth) {
    const calendar = google.calendar({ version: 'v3', auth });

    const event = {
        'summary': 'Test Event',
        'description': 'This is a test event',
        'start': {
            'dateTime': '2024-04-09T10:00:00',
            'timeZone': 'Ukraine/Kiev',
        },
        'end': {
            'dateTime': '2024-04-09T11:00:00',
            'timeZone': 'Ukraine/Kiev',
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

const oauth2Client = new google.auth.OAuth2({
  client_id : "",
  client_secret:"",
  redirect_uris: [
    "http://localhost:3000/oauth2callback"
  ]
});

// Запуск автентифікації та створення події
// authenticate(createEvent);


// const auth = new google.auth.GoogleAuth({
//   scopes: ['https://www.googleapis.com/auth/calendar/shkliarskyi_ak22@nuwm.edu.ua'],
// });

// /**
//  * To use OAuth2 authentication, we need access to a CLIENT_ID, CLIENT_SECRET, AND REDIRECT_URI
//  * from the client_secret.json file. To get these credentials for your application, visit
//  * https://console.cloud.google.com/apis/credentials.
//  */
// const oauth2Client = new google.auth.OAuth2({
//   client_id : "",
//   client_secret:"",
//   redirect_uris: [
//     "http://localhost:8080"
//   ]
// });

// // Access scopes for read-only Drive activity.
// const scopes = [
//   'https://www.googleapis.com/auth/calendar/shkliarskyi_ak22@nuwm.edu.ua'
// ];

// // Generate a url that asks permissions for the Drive activity scope
// const authorizationUrl = oauth2Client.generateAuthUrl({
//   // 'online' (default) or 'offline' (gets refresh_token)
//   access_type: 'offline',
//   /** Pass in the scopes array defined above.
//     * Alternatively, if only one scope is needed, you can pass a scope URL as a string */
//   scope: scopes,
//   // Enable incremental authorization. Recommended as a best practice.
//   include_granted_scopes: true
// });
// console.log(authorizationUrl);







// const SCOPES = ['https://www.googleapis.com/auth/calendar'];

// const TOKEN_PATH = path.join(process.cwd(), 'token.json');
// const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

// /**
//  * Reads previously authorized credentials from the save file.
//  *
//  * @return {Promise<OAuth2Client|null>}
//  */
// async function loadSavedCredentialsIfExist() {
//   try {
//     const content = await fs.readFile(TOKEN_PATH);
//     const credentials = JSON.parse(content);
//     return google.auth.fromJSON(credentials);
//   } catch (err) {
//     return null;
//   }
// }

// /**
//  * Serializes credentials to a file compatible with GoogleAuth.fromJSON.
//  *
//  * @param {OAuth2Client} client
//  * @return {Promise<void>}
//  */
// async function saveCredentials(client) {
//   const content = await fs.readFile(CREDENTIALS_PATH);
//   const keys = JSON.parse(content);
//   const key = keys.installed || keys.web;
//   const payload = JSON.stringify({
//     type: 'authorized_user',
//     client_id: key.client_id,
//     client_secret: key.client_secret,
//     refresh_token: client.credentials.refresh_token,
//   });
//   await fs.writeFile(TOKEN_PATH, payload);
// }

// /**
//  * Load or request or authorization to call APIs.
//  *
//  */
// async function authorize() {
//   let client = await loadSavedCredentialsIfExist();
//   if (client) {
//     return client;
//   }
//   client = await authenticate({
//     scopes: SCOPES,
//     keyfilePath: CREDENTIALS_PATH,
//   });
//   if (client.credentials) {
//     await saveCredentials(client);
//   }
//   return client;
// }

// /**
//  * Lists the next 10 events on the user's primary calendar.
//  * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
//  */
// async function listEvents(auth) {
//   const calendar = google.calendar({version: 'v3', auth});
//   const res = await calendar.events.list({
//     calendarId: 'primary',
//     timeMin: new Date().toISOString(),
//     maxResults: 10,
//     singleEvents: true,
//     orderBy: 'startTime',
//   });
//   const events = res.data.items;
//   if (!events || events.length === 0) {
//     console.log('No upcoming events found.');
//     return;
//   }
//   console.log('Upcoming 10 events:');
//   events.map((event, i) => {
//     const start = event.start.dateTime || event.start.date;
//     console.log(`${start} - ${event.summary}`);
//   });
// }

// authorize().then(listEvents).catch(console.error);

// async function authenticateImplicitWithAdc() {
//   // This snippet demonstrates how to list buckets.
//   // NOTE: Replace the client created below with the client required for your application.
//   // Note that the credentials are not specified when constructing the client.
//   // The client library finds your credentials using ADC.
//   const storage = new Storage({
//     projectId,
//   });
//   const [buckets] = await storage.getBuckets();
//   console.log('Buckets:');

//   for (const bucket of buckets) {
//     console.log(`- ${bucket.name}`);
//   }

//   console.log('Listed all storage buckets.');
// }

// authenticateImplicitWithAdc();

// async function main() {

//   // Acquire an auth client, and bind it to all future calls
//   const authClient = await auth.getClient();
//   google.options({auth: authClient});

//   // Do the magic
//   const res = await calendar.calendars.clear({
//     // Calendar identifier. To retrieve calendar IDs call the calendarList.list method. If you want to access the primary calendar of the currently logged in user, use the "primary" keyword.
//     calendarId: 'shkliarskyi_ak22@nuwm.edu.ua',
//   });
//   console.log(res.data);
// }

// main().catch(e => {
//   console.error(e);
//   throw e;
// });





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







// AIzaSyB0aZnUboco9gpoYoupsEZCzRCrXAR5R6I  apikey



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
app.get("/home.ejs", (req, res) => {
    res.render("home.ejs");
    getAccessToken(oauth2Client);
    // authenticate(createEvent);

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
    res.render("info.ejs")
    // console.log(authorizationUrl);
    // res.writeHead(301, { "Location": authorizationUrl })
    // req.render(authorizationUrl);
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
      // res.writeHead(301, { "Location": authorizationUrl });
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
    res.render("teacher.ejs")
})
app.listen(port, () => {
    console.log(`Server running on port ${port}.`)
})