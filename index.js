const express= require("express");
const app=express();
const port = 8080;
const mysql= require("mysql2");
app.set("view engine","ejs");
const path=require("path");
app.set("views",path.join(__dirname,"./views"));

//-------------we need the below middleware to read the data from the post request....
app.use(express.urlencoded({extended: true}));
app.use(express.json())

//---------------------using method override package to send delete reqest and patch request.

//npm install method-override
const methodOverride = require('method-override');
// Override with POST having ?_method=DELETE
app.use(methodOverride('_method'));

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
const upload = multer({ storage: storage }).single('itemImage');  
//NOTE: each time you take file input you have to make sure that when you take input file the name property
//of the file must math in .single(name property)
//--------------------------------------------

//----------------------=====sessions---------------
const session = require('express-session');

app.use(session({
    secret: 'some_secret_key',  // Change this to a more secure key
    resave: false,
    saveUninitialized: false,
    cookie:{secure:false}
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
    console.log("Hello")
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
            req.session.name=result[0].name;
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
        res.render("user.ejs", { posts: posts, username: req.session.name });
       
        
    });
});

//-------------------------ALL THE POSTS USER HAD MADE-----------------------------//
app.get("/posts",(req,res)=>{
    const userID=req.session.userId;
    if(!userID){
        return res.status(400).json({ error: 'User ID is required' });
    }
    const sql=`SELECT * FROM posts WHERE user_id = ?`;
    connection.query(sql,[userID],(err,results)=>{
        if(err){
            console.error('Failed to retrieve posts: ' + err);
            return res.status(500).json({ error: 'Database query failed' });
        }
        console.log(results);
        res.render("myPosts.ejs",{posts:results});
    })
})
//------------------------ENABLING USER TO POST THE FOUND Items--------------------//
app.get("/found",(req,res)=>{
    res.render("uploadLostItem.ejs")
})
     //---UPDATING DATABASE BASED ON THE USER RESPONSE TO POST LOST ITEM-----
app.post("/uploadPost",upload,(req,res)=>{
    if (!req.session.userId) {
        return res.redirect("/login");  // Ensuring user is logged in
    }

    const image = req.file;
    const imagePath=`../${image.filename}`;
    let {itemName,itemColor,itemCategory,itemMake,itemModel,address}=req.body;

  
    let q=`INSERT INTO posts (user_id,post_content,post_picture,color,item_category,item_make,item_model,location_lost) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    connection.query(q,[req.session.userId,itemName,imagePath,itemColor,itemCategory,itemMake,itemModel,address],(err,results)=>{
        if (err) {
            console.log(err);
            res.status(500).send("Error occurred while posting item");
        } else {
            let q = 'SELECT * FROM posts WHERE user_id = ?'; // Query to get all posts for the logged-in user
            connection.query(q, [req.session.userId], (err, results) => {
                if (err) {
                    console.log(err);
                    return res.status(500).send("Error retrieving posts");
                }
                if (results.length > 0) {
                    res.render('myPosts.ejs', { posts: results });
                } else {
                    res.render('myPosts.ejs', { posts: [] });
                    console.log("No posts found for user:", req.session.userId);
                }
             }); // Redirect to user profile or another appropriate page
        }

    })
});
    app.delete("/deletePost/:post_id", (req, res) => {
        if (!req.session.userId) {
            return res.status(401).send("Unauthorized");
        }
    
        const postId = req.params.post_id;
        const userId = req.session.userId;  // Ensure session is correctly set
    
        const query = 'DELETE FROM posts WHERE post_id = ? AND user_id = ?';
        connection.query(query, [postId, userId], (err, result) => {
            if (err) {
                console.error("Failed to delete post:", err);
                return res.status(500).send("Failed to delete the post");
            }
            if (result.affectedRows === 0) {
                return res.status(404).send("Post not found or user does not have permission to delete this post");
            }
            res.render("/posts");
        });
    });
    
    //------------------searching the posts based on the category---------------------------
    app.get("/searchLost",(req,res)=>{
        if (!req.session.userId) {
            return res.redirect("/login");  // Ensuring user is logged in
        }
        //console.log(req.query.category); this show the value that was selected 
        let q=`SELECT * FROM posts WHERE item_category = ? AND user_id != ?`;
        connection.query(q,[req.query.category,req.session.userId],(err,results)=>{
            if (err) {
                // Handle the error appropriately
                console.error("Error executing query", err);
                res.status(500).send("Error executing query");
            }
            res.render("allPosts.ejs",{posts:results});
        })


    });





    


