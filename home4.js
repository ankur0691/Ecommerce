var express = require('express');
var path = require('path');
var bodyParser=require('body-parser');
var port = 4000;
var app = express();

var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://root:root@cluster0-shard-00-00-kmrpy.mongodb.net:27017,cluster0-shard-00-01-kmrpy.mongodb.net:27017,cluster0-shard-00-02-kmrpy.mongodb.net:27017/Cluster0?ssl=true&replicaSet=Cluster0-shard-0&authSource=admin";


//Connection to DB
var mysql = require('mysql');
var dbconnect = mysql.createConnection({
        host: 'mydbinstance.crku7bfmndg7.us-east-1.rds.amazonaws.com',
        port: '3306',
        user: 'root',
        password: 'rootpassword',
        database: 'my_db'
});

dbconnect.connect((error)=>{
        if(error){
                console.log('Error : Could not connect to DB');
        } else {
                console.log('DB Connected');
        }
});

var cookieParser = require('cookie-parser');
//setting up body parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:false}));
app.use(cookieParser());


//function to check whether  session is logged in
function requireLogin (req, res, next) {
        if (!req.cookies.cookiename) {
				//console.log('You are not currently logged in');
                res.json({message:'You are not currently logged in'});
                } else {
                next();
                }
};

//function to check whether user is admin
function checkadmin (req, res , next) { 
		if (req.cookies.cookiename.user != "jadmin") {
			//console.log('You must be an admin to perform this action');
			res.json({message:'You must be an admin to perform this action'});
		} else {
			next();
		}
};

//function to check emptystrings object
function isEmptyObject(obj) {
		for ( var entry in obj)
		{
			if (obj[entry].length < 1)
				return true;
			if (/^\s/.test(obj[entry])) 
				return true;
		}
		return false;
}

// / 
app.get('/',(req,res,next)=>{
	res.send('Hello');
});

//register
app.post('/registerUser',(req,res)=>{
		if(isEmptyObject(req.body)) 
		{
			//console.log('The input you provided is not valid111111');
			res.json({message : 'The input you provided is not valid'});
		}
		else{
		var user_info={
			"fname" : req.body.fname,
			"lname"	: req.body.lname,
			"address" : req.body.address,
			"city" : req.body.city,
			"state" : req.body.state,
			"zip" : req.body.zip,
			"email" : req.body.email,
			"username" : req.body.username,
			"password" : req.body.password
		};
		dbconnect.query('INSERT INTO users set ?',user_info, function(error, results, fields) {
				if (error) {
						//console.log('', error);
						//console.log('The input you provided is not valid');
						res.json({message : 'The input you provided is not valid'});
				}
					else 
					{
						//console.log(req.body.fname + ' was registered successfully');
						res.json({message : req.body.fname + ' was registered successfully'});
					}			
							});
		}
			});
			
//login
app.post('/login',(req,res)=>{
        var username = req.body.username;
        var password = req.body.password;
        //console.log(username,password);
        dbconnect.query("SELECT * FROM users where username = ? and password = ?",[username,password],
        function(error,rows,fields) {
                if(error){
                        //console.log('error in the query ', error);
                        res.send(400, 'error occured in querying db');
                }else if(rows.length > 0){
                        //setting cookie with user info
						var cookie_info={
							"user" : username,
							"fname" : rows[0].fname
						};
                        res.cookie('cookiename',cookie_info,{ json:true, maxAge: 15*60*1000, httpOnly: true });
						//console.log('Welcome '+ rows[0].fname);
                        res.json({message : 'Welcome ' + rows[0].fname});
                        app.use((req,res,next)=>{
                                if(req.cookies && req.cookies.cookiename){
                                        res.cookie('cookiename', cookie_info ,{ json:true, maxAge: 15*60*1000, httpOnly: true });
                                }
                                next();
                                });
                         }else{
							 //console.log('There seems to be an issue with the username/password combination that you entered');
                        res.json({message : 'There seems to be an issue with the username/password combination that you entered'});
                        }

        });

});
			
//logout
app.post('/logout',(req, res) => {
        if (req.cookies){
				//console.log('You have been successfully logged out');
				res.clearCookie('cookiename');
                res.json({message:'You have been successfully logged out'});
        } else
                res.json({message:'You are not currently logged in'});
});

//updateInfo
app.post('/updateInfo',requireLogin,(req,res) => {
	    res.clearCookie('cookiename');
		res.cookie('cookiename',req.cookies.cookiename,{ json:true, maxAge: 15*60*1000, httpOnly: true });
		if(isEmptyObject(req.body)) {
			//console.log('The input you provided is not valid');
			res.json({message : 'The input you provided is not valid'});
		}
		else {
			dbconnect.query('UPDATE users set ? where ?',[req.body, {username: req.cookies.cookiename.user}], function(error, rows, fields) {
				if (error || rows.affectedRows == 0) {
						//console.log('', error);
						//console.log('The input you provided is not valid');
						res.json({message : 'The input you provided is not valid'});
				}
					else {
						if (req.body.username){
							var cookie_info2={
									"user" : req.body.username,
									"fname": (req.body.fname == null ? req.cookies.cookiename.fname : req.body.fname)
								};
								res.clearCookie('cookiename');
								res.cookie('cookiename',cookie_info2,{ json:true, maxAge: 15*60*1000, httpOnly: true });
								app.use((req,res,next)=>{
									if(req.cookies && req.cookies.cookiename){
									res.cookie('cookiename',cookie_info2,{ json:true, maxAge: 15*60*1000, httpOnly: true }); 
                                }
                                next();
                                });		
						}
						//console.log(req.cookies.cookiename.fname + ' your information was successfully updated');
						res.json({message : req.cookies.cookiename.fname + ' your information was successfully updated'});
						
					}
							});
		}
});

//addProducts
app.post('/addProducts',requireLogin,checkadmin,(req,res) => {
		res.clearCookie('cookiename');
		res.cookie('cookiename',req.cookies.cookiename,{ json:true, maxAge: 15*60*1000, httpOnly: true });
		if(isEmptyObject(req.body)) {
			//console.log('The input you provided is not valid11111');
			res.json({message : 'The input you provided is not valid'});
		}
		else{
		var product_info = {
			"asin" : req.body.asin,
			"productName" : req.body.productName,
			"productDescription" : req.body.productDescription,
			"groupName" : req.body.group
		};
		dbconnect.query('INSERT INTO products set ?',product_info, function(error, rows, fields) {
				if (error) {
						//console.log('', error);
						//console.log('The input you provided is not valid');
						res.json({message : 'The input you provided is not valid'});
				}
					else 
					{
						//console.log(req.body.productName + ' was successfully added to the system');
						res.json({message : req.body.productName + ' was successfully added to the system'});
						
					}
								
							});
		}
});

			
//modifyProduct
app.post('/modifyProduct',requireLogin,checkadmin,(req,res) => {
		res.clearCookie('cookiename');
		res.cookie('cookiename',req.cookies.cookiename,{ json:true, maxAge: 15*60*1000, httpOnly: true });
		if(isEmptyObject(req.body)){
			//console.log('The input you provided is not valid11111');
			res.json({message : 'The input you provided is not valid'});
		}
		else{
		var update_product = {
			"asin" : req.body.asin,
			"productName" : req.body.productName,
			"productDescription" : req.body.productDescription,
			"groupName" : req.body.group
		};
		dbconnect.query('UPDATE products set ? where ?',[update_product, {asin: req.body.asin}], function(error, rows, fields) {
				if (error || rows.affectedRows == 0 ) {
						//console.log('', error);
						//console.log('The input you provided is not valid');
						res.json({message : 'The input you provided is not valid'});
				}
					else {
						//console.log(req.body.productName + ' was successfully updated');
						res.json({message : req.body.productName + ' was successfully updated'});
					}
							});
		}
});

//viewUsers
app.post('/viewUsers',requireLogin,checkadmin,(req,res) => {
		res.clearCookie('cookiename');
		res.cookie('cookiename',req.cookies.cookiename,{ json:true, maxAge: 15*60*1000, httpOnly: true });
		var fname = (req.body.fname == null ? "" : req.body.fname);
        var lname = (req.body.lname == null ? "" : req.body.lname);
        //console.log(fname,lname);
        dbconnect.query("SELECT * FROM users where fname like ? and lname like ?",['%'+fname+'%','%'+lname+'%'],
        function(error,rows,fields) {
                if(error){
                        //console.log('error in the query ', error);
                        res.send(400, 'error occured in querying db');
                }else if (rows.length == 0){
					//console.log('The input you provided is not valid2222222222');
					res.json({message : 'There are no users that match that criteria'});
				}
					else if(rows.length > 0){
						var result = {
							"message" : 'The action was successful' ,
							"user" : [] 
							};
                        for( var i=0; i < rows.length; i++)
						{
								//console.log('First name:'+rows[i].fname+' Last name'+rows[i].lname);
								var userValue = {};
								userValue["fname"] = rows[i].fname;
								userValue["lname"] = rows[i].lname;
								userValue["userId"] = rows[i].username;
								result["user"].push(userValue);
						}
					//console.log(result);
					res.json(result);
					}
        });

});

//viewProducts
app.post('/viewProducts',(req,res)=>{
		res.clearCookie('cookiename');
		res.cookie('cookiename',req.cookies.cookiename,{ json:true, maxAge: 15*60*1000, httpOnly: true });
		var asin = (req.body.asin == null? "%" : req.body.asin);
		var productName = (req.body.keyword == null ? "" : req.body.keyword);
        var productDescription = (req.body.keyword == null ? "" : req.body.keyword);
		var groupName = (req.body.group == null? "%" : req.body.group);
        console.log(asin,productName,productDescription,groupName);
        dbconnect.query("SELECT * FROM products where (asin like ? and groupName like ?) and (productName like ? or productDescription like ?)",[asin,groupName,productName+'%',productDescription+'%'],
        function(error,rows,fields) {
                if(error){
                        //console.log('error in the query ', error);
                        res.send(400, 'error occured in querying db');
                }else if (rows.length == 0){
					//console.log('The input you provided is not valid2222222222222');
					res.json({message : 'There are no products that match that criteria'});
				}
					else if(rows.length > 0){
						var result = {
							"product" : [] 
							};
                        for( var i=0; i < rows.length; i++)
						{
								//console.log('asin:'+rows[i].asin+' productName'+rows[i].productName);
								var productValue = {};
								productValue["asin"] = rows[i].asin;
								productValue["productName"] = rows[i].productName;
								result["product"].push(productValue);
						}
					//console.log(result);
					res.json(result);
					}
        });

});


//buy Product
app.post('/buyProducts',requireLogin,(req,res) => {
	res.clearCookie('cookiename');
	res.cookie('cookiename',req.cookies.cookiename,{ json:true, maxAge: 15*60*1000, httpOnly: true });
	//console.log("buyProducts");
	var asincount;  
	var unique = {};
    var distinct = [];
    for( var i in req.body.products ){
			if( typeof(unique[req.body.products[i].asin]) == "undefined"){
			distinct.push(req.body.products[i].asin);
        }
        unique[req.body.products[i].asin] = 0;
    }
	dbconnect.query('SELECT asin, productName from products where asin in (?) order by asin',[distinct], function(error, rows, fields) {
				if (error) {
						//console.log('', error);
						//console.log('The input you provided is not valid');
						res.json({message : 'The input you provided is not valid'});
				}
					else if (rows.length != distinct.length){
						//console.log('There are no products that match that criteria');
						res.json({message : 'There are no products that match that criteria'});
					}
					else{
						var map={};
						for( var i=0; i < rows.length; i++)
						{
							    map[rows[i].asin] = rows[i].productName;
						}
						
						MongoClient.connect(url, function(error, db) {
							if(error){
								return console.dir(error);
							} else{
							    for( var i in req.body.products ){
									//console.log(map[req.body.products[i].asin]);
									//console.log(req.cookies.cookiename.user);
									db.collection("user_product").update({ "_user": req.cookies.cookiename.user, "_asin": req.body.products[i].asin, "_name": map[req.body.products[i].asin] }, { $inc: { "_quantity": 1}, $set: {"_user": req.cookies.cookiename.user, "_asin": req.body.products[i].asin, "_name": map[req.body.products[i].asin]}}, {upsert: true, multi: true});
								}
								
								var relatedProduct= {};
								var result = [];
								var item;
								var cursor;
								var count;
								
								for( var j in distinct){
									item = {};
									for( var k in distinct){
										let flag=false;
										if (distinct[j]!= distinct[k]){
											let x=distinct[j];
											let y=distinct[k];
											console.log(x);
											console.log(y);
											db.collection("products_products").find({"_id": x, "relatedProduct._asin2": y}).forEach( function(doc,err) { 
											flag=true; 
											console.log(flag);
											}, function() {
									
										
											if(flag){
									
											console.log('doc found ');
											db.collection("products_products").update({ "_id" : x ,  "relatedProduct._asin2": y} ,{ $inc: { "relatedProduct.$._count": 1}}, {upsert: true});
	
												
											}else{
											console.log('doc not found');										
											db.collection("products_products").update({ "_id": x},{$push:{relatedProduct: {$each: [ {_asin2:y,_count:1}], $sort: {_count:-1}}}},{upsert:true} );
											}
											});
										}
									}
								
								}
						}
						db.close();
						});
							//console.log('The action was successful');
							res.json({message : 'The action was successful'});
					}
							});
});

app.post('/productsPurchased', requireLogin, checkadmin, (req,res) => {
	res.clearCookie('cookiename');
	res.cookie('cookiename',req.cookies.cookiename,{ json:true, maxAge: 15*60*1000, httpOnly: true });
	var result = {
					"message" : 'The action was successful' ,
					"products" : [] 
				};
	console.log("productsPurchased");
	MongoClient.connect(url, function(error, db) {
							if(error){
								console.log(error);
							} else{
							db.collection("user_product").find({_user: req.body.username}).toArray(function(err, rows) {
								  if(error) {
									  return console.dir(error);
								  } else if(rows.length <= 0) {
										  
										  res.json({message: 'There are no users that match that criteria'});
										} else {
												
												for( var i=0; i < rows.length; i++)
												{
													var productValue = {};
													productValue["productName"] = rows[i]._name;
													productValue["quantity"] = rows[i]._quantity;
													result["products"].push(productValue);
												}
											console.log(result);
											res.json(result);
											}	
								  },function(){
							res.json(result);
							db.close();
								  });
							}
							});
							
							
});


app.post('/getRecommendations',requireLogin,(req,res) => {
	res.clearCookie('cookiename');
	res.cookie('cookiename',req.cookies.cookiename,{ json:true, maxAge: 15*60*1000, httpOnly: true });
	console.log("****************************** RECOMMENDATION!***************************");
	MongoClient.connect(url, function(error, db) {
		if(error){
			console.log(error);
	} else{
		   let x=req.body.asin;
		   let y={};
		   db.collection("product_product").update({ "_id": req.body.asin },{ $push: { relatedProduct: { $each: [ ], $sort: { _count: -1 } }} });
		   db.collection("product_product").find({"_id": x},{"relatedProduct._asin2":1}).forEach( function(doc,err) 
		   {  
		     y = doc.relatedProduct;			 
			 console.log(doc.relatedProduct.asin);
		   }, function() {
			   //console.log(y);
			   if(y.length == 0) 
			   {
			   //console.log("There are no recommendations for that product");
			   res.json({message : "There are no recommendations for that product"});
				} else {
					var result = {
				   "message" : "The action was successful" , 
				   "products" : []
					};
					result["products"].push(y.slice(0,5));
					//console.log(result);
					res.json(result);
					}
	
	});	
	}
	db.close();
});
res.json({message : "There are no recommendations for that product"});
});

app.listen(port,(err) => {
  if (err) {
    return console.log('something bad happened while listening to port', err);
  }
        console.log('Server started on port '+port);
});

