const express= require("express");
const app=express();
const port = 8080;
const mysql= require("mysql2");
app.set("view engine","ejs");
const path=require("path");
app.set("views",path.join(__dirname,"./views"));
app.use(express.urlencoded({extended: true}));
app.use(express.json())

//------------image multer package----------------

const multer = require("multer");
const { SourceTextModule } = require("vm");
// Initialize upload

// Set storage engine
const storage=multer.diskStorage({
    destination: function (req,file,cb){
        return cb(null,"./uploads");
    },
    filename:function(req,file,cb){
        return cb(null,`${Date.now()}-${file.originalname}`);
    }
});

app.use(express.static(path.join(__dirname, 'uploads')));
const upload = multer({ storage: storage }).single('image');  // Ensure 'post_picture' is the correct field name

//--------------------------------------------

//----------------------=====sessions---------------
const session = require('express-session');

app.use(session({
    secret: 'some_secret_key',  // Change this to a more secure key
    resave: false,
    saveUninitialized: false,
}));
//----------------------------------------------
app.listen(port,()=>{
    console.log(`listening to the port ${port}`)
})
const connection= mysql.createConnection({
    host:'localhost',
    user:'root',
    database:'lostFound',
    password:'Anjan@$12345',
    port:3306,
});

app.get("/",(req,res)=>{
    res.render("homepage.ejs");
})
app.get("/login",(req,res)=>{
    res.render("login.ejs");
})

//----------------------Sign up----------------------
app.get("/signup",(req,res)=>{
    res.render("signup.ejs");
 
});

app.post("/submit", (req, res) => {
    let {name, email, password } = req.body;
    let q = "INSERT INTO list (name, email, password) VALUES (?,?,?)";
    let list = [name, email, password];
    connection.query(q, list, (err, result) => { // Added the user array as the second argument
        if (err) {
            console.log(err); // Handle the error properly
            res.status(500).send("Error occurred while adding user"); // Send an error response
        } else {
            res.render("login.ejs")
        }
    });
});

//-------------------------------login--------------------------


app.post("/submit-your-login-form", (req, res) => {
    let { username, password } = req.body;
    let q = "SELECT * FROM list WHERE email = ? AND password = ?";
    connection.query(q, [username, password], (err, result) => {
        if (err) {
            console.log(err);
            res.status(500).send("Error occurred while logging in");
        } else if (result.length === 0) {
            res.render("loginIncorrect.ejs", { message: "Incorrect username or Password" });
        } else {
            req.session.userId = result[0].user_id;  // Store user_id in session
            res.redirect("/user");
        }
    });
});
app.get("/lost",(req,res)=>{
    res.render("lost.ejs");
})
app.post('/postlost', upload, (req, res) => {
    if (!req.session.userId) {
        return res.redirect("/login");  // Ensuring user is logged in
    }

    // Extract text fields
    const { post_content,color } = req.body;
    const image = req.file;
    const imagePath=`../${image.filename}`;
    console.log(imagePath)  // Using the path from the uploaded file
    const user_id = req.session.userId;

    let q = "INSERT INTO posts (user_id, post_content, post_picture, color) VALUES (?, ?, ?, ?)";
    connection.query(q, [user_id, post_content, imagePath, color], (err, result) => {
        if (err) {
            console.log(err);
            res.status(500).send("Error occurred while posting item");
        } else {
            res.redirect("/user");  // Redirect to user profile or another appropriate page
        }
    });
});

app.get("/user", (req, res) => {
    if (!req.session.userId) {
        // Redirect to login page if the user is not logged in
        return res.redirect("/login");
    }

    const user_id = req.session.userId;
    // Query to fetch posts along with user name from the 'list' table
    const q = `
        SELECT posts.*, list.name as user_name
        FROM posts
        JOIN list ON posts.user_id = list.user_id
        WHERE posts.user_id = ?
        ORDER BY posts.post_date DESC
    `;

    connection.query(q, [user_id], (err, results) => {
        if (err) {
            console.log(err);
            res.status(500).send("Error occurred while fetching your posts");
        } else {
            posts=results;
        }
        res.render("user.ejs", { posts: posts, username: req.session.userName });
       
        
    });
});

