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
const upload=multer({storage});
app.use(express.static(path.join(__dirname, 'uploads')));





//--------------------------------------------
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
app.get("/user",(req,res)=>{
    connection.query(`SELECT * FROM users`,(err,result)=>{
        if(err)throw err;
        res.render("home.ejs",{result});
    })
})
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
    let q = `SELECT * FROM list WHERE email='${username}' AND password='${password}'`;
    connection.query(q, (err, result) => {
        if (err) {
            console.log(err);
            res.status(500).send("Error occurred while logging in");
        } else {
            if (result.length === 0) {
                // No matching user found
                let {message}="Incorrect username or Password"
                res.render("loginIncorrect.ejs",{message})
            } else {
                // User found, password correct
                console.log(result);
                res.render("user.ejs",{username})
            }
        }
    });
});

//======================lost page=========================


app.get("/lost",(req,res)=>{
    res.render("lost.ejs")
})

///=============================image part===============
app.post("/postlost", upload.array('image', 10), (req, res) => {
    const { email, password } = req.body;
    const files = req.files;

    // Assuming there's only one file uploaded per request
    const filename = files[0]

    // Construct the file path
    const filePath = `../${filename.filename}`;

    // Update the filename in the list table for the user with the specified email and password
    const q = `UPDATE list SET filename = ? WHERE email = ? AND password = ?`;

    connection.query(q, [filePath, email, password], (err, result) => {
        if (err) {
            console.log(err);
            return res.send("Error occurred while updating filename");
        }

        // Render a webpage with the uploaded image displayed
        console.log(filePath)
        res.redirect("/homepage.ejs",{filePath});
    });
});
app.get("/homepage")