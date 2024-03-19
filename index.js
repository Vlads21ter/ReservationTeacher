import express from "express";

const app = express();
const port = 3000;

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
app.get("/student.ejs", (req, res) => {
    res.render("student.ejs")
})
app.get("/teacher.ejs", (req, res) => {
    res.render("teacher.ejs")
})
app.listen(port, () => {
    console.log(`Server running on port ${port}.`)
})