const express = require('express')
const app = express()
const cors = require('cors');
const admin = require("firebase-admin");
require('dotenv').config();
const { MongoClient } = require('mongodb');
const ObjectId = require('mongodb').ObjectId;
const stripe = require('stripe')(process.env.STRIPE_SECRET);
const fileUpload =require('express-fileupload');


const port = process.env.PORT || 2000;



// doctor - portal - bb0e0 - firebase - adminsdk - e61do - c1663db2f1.json


const serviceAccount = require('./doctor-portal-bb0e0-firebase-adminsdk-e61do-c1663db2f1.json');


admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});


app.use(cors());
app.use(express.json());
app.use(fileUpload());



// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.zoj9s.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const uri = 'mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0-re3gq.mongodb.net/test?retryWrites=true'

//console.log(uri)

//client
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });


// verifyToken
async function verifyToken (req, res, next){
    if (req.headers?.authorization?.startsWith('Bearer ')) {
        const token = req.headers.authorization.split(' ')[1];

          try{
              const decodedUser = await admin.auth().verifyIdToken(token);
              req.decodedEmail = decodedUser.email;
          }
          catch{

          }
    }
    next();
}



async function run(){

   try{
      await client.connect();
    //   console.log('database connected successfully')
    
    const database = client.db('doctors_portal');
    const appointmentsCollection = database.collection('appointments');
    
    //user collection
    const usersCollection = database.collection('users');

    //doctor collection
       const doctorsCollection = database.collection('doctors');


//Appointments data load
       app.get('/appointments', verifyToken, async(req, res) => {
           const email = req.query.email;  //email diye filter korbo
        
        //    const date = new Date(req.query.date).toDateString();
           const date = req.query.date;

           console.log(date);
           
           const query = { email: email, date: date }
        //   date: date
           const cursor = appointmentsCollection.find(query);
           console.log(query)
           console.log(date)
           const appointments = await cursor.toArray();
           res.json(appointments);
       })

// payment load (Load appointment specific data install stripe and stripe for react)
       app.get('/appointments/:id', async(req, res) =>{
           const id = req.params.id;
           const query = { _id: ObjectId(id)};
           const result = await appointmentsCollection.findOne(query);
           res.json(result);
       })
   
// server a data gulo pathabo  

       app.post('/appointments', async (req, res) => {
           const appointment = req.body;
           const result = await appointmentsCollection.insertOne(appointment);
        //    console.log(result);
           res.json(result)
       });


// appointments update
       app.put('/appointments/:id', async(req, res) => {
           const id = req.params.id;
           const payment = req.body;
           const filter = {_id: ObjectId(id)};
           const updateDoc = {
               $set: {
                   payment: payment
               }
             };
               const result = await appointmentsCollection.updateOne(filter, updateDoc);
               res.json(result);
        }) 
        
   
       app.get('/doctors', async (req, res) => {
          const cursor = doctorsCollection.find({});
          const doctors = await cursor.toArray();
          res.json(doctors)

       })

//doctor add 
       app.post('/doctors', async (req, res) => {
           const name = req.body.name;
           const email = req.body.email;
           const pic = req.files.image;
           const picData = pic.data;
           const encodedPic = picData.toString('base64');
           const imageBuffer = Buffer.from(encodedPic, 'base64');
           const doctor = {
               name,
               email,
               image: imageBuffer
           }
           const result = await doctorsCollection.insertOne(doctor);
           res.json(result);
       })
    







       
 // admin verified - যার email দেয়েছি সে কি admin or admin না
       app.get('/users/:email', async (req, res) => {
          const email = req.params.email;
          const query = { email: email};
          const user = await usersCollection.findOne(query);
          let isAdmin = false;
          if(user?.role === 'admin'){
            isAdmin = true;
          }
          res.json({admin: isAdmin});
       })


//user j data তৈরি করবে / redister korbe tar information database a thakbe.. সেই data .. database a রাখবো- useFirebase.js
       app.post('/users', async(req, res) =>{
           const user = req.body;
           const result = await usersCollection.insertOne(user);
           console.log(result);
           res.json(result);
       })


   /// google দিয়ে login করলে database  এ ইনফর্মেশন যাবে
       app.put('/users', async(req, res) =>{
           const user = req.body;
           const filter = {email: user.email};
           const options = { upsert: true };
           const updateDoc = {$set: user};
           const result = await usersCollection.updateOne(filter, updateDoc, options);
           res.json(result);
       });
   
          
// Admin users তৈরি
       app.put('/users/admin', verifyToken, async(req, res) => {
         const user = req.body;
          const requester =  req.decodedEmail;
         // সে নিজে  admin কি না check করব
           if(requester){
               const requesterAccount = await usersCollection.findOne({email: requester});
               if(requesterAccount.role === 'admin'){
                   const filter = { email: user.email };
                   const updateDoc = { $set: { role: 'admin' } };
                   const result = await usersCollection.updateOne(filter, updateDoc);
                   res.json(result);
               }
           }
           else{
               res.status(403).json({ message: 'you do not have access to make admin' })
           }
       })

// PAYMENT ER TK KOTO KATBE
       app.post('/create-payment-intent', async(req,res) => {
           const paymentInfo = req.body;
           const amount = paymentInfo.price * 100;
           const paymentIntent = await stripe.paymentIntents.create({
               currency: 'usd',
               amount: amount,
               payment_method_types: ['card']

           });
           res.json({ clientSecret: paymentIntent.client_secret })
               
        })   
    }   

    finally{

    //   await client.close() 
   
      }
}


run().catch(console.dir);    

app.get('/', (req, res) => {
    res.send('Hello Doctors portals')
})

app.listen(port, () => {
    console.log(`listening at ${port}`)
})       
