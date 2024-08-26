const express = require("express");
const cors = require("cors");
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const app = express();
require('dotenv').config();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

//middleware
app.use(cors({
  origin: [
    'http://localhost:5173'
    
    
  ],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

console.log(process.env.DB_PASS)


const uri =
  `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.q8tmknr.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// middlewares
const verifyToken = async(req, res, next) => {
  const token = req.cookies?.token;
  console.log('value of token in middleware', token)
  if(!token){
    return res.status(401).send({message: 'not authorized'})
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    // error
    if(err){
      console.log(err);
      return res.status(401).send({message:'unauthorized'})
    }
    // if token is valid than it would be decord
    console.log('value in the token', decoded)
    req.user = decoded;
    next()
  })
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const allfoodCollection = client.db('kalssyCafe').collection('allfooditems');
    const ordersCollection = client.db('kalssyCafe').collection('orders');

    // auth related api
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '1h'
      });
     res
     .cookie('token', token, {
      httpOnly: true,
      secure: false,
      
     })
     .send({success: true});
    })

    // services related api
    app.get('/allfooditems', async(req, res) =>{
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      console.log('pagination query', req.query)
      const cursor = allfoodCollection.find();
      const result = await cursor
      .skip(page * size)
      .limit(size)
      .toArray();
      res.send(result);
    })

    app.get('/allfooditemsCount', async(req, res) => {
      const count = await allfoodCollection.estimatedDocumentCount();
      res.send({count});
    })

    app.get('/allfooditems/:id', async(req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id) }

      const options = {
        
        // Include only the `title` and `imdb` fields in each returned document
        projection: { title: 1, name: 1, img: 1, category: 1, price: 1,  },
      };
  

      const result = await allfoodCollection.findOne(query, options);
      res.send (result);
    })

    // orders
    app.get('/orders', verifyToken, async (req, res) =>{
      console.log(req.query.email);
      // console.log('token', req.cookies.token)
      console.log('user in the valid token', req.user)
      if(req.query.email !== req.user.email){
        return res.status(403).send({message: 'forbidden access'})
      }
      let query = {};
      if(req.query?.email){
        query = {email:req.query.email}
      }
      const result = await ordersCollection.find(query).toArray();
      res.send (result);
    })

    app.post('/orders', async (req, res) => {
      const order = req.body;
      console.log(order);
      const result = await ordersCollection.insertOne(order);
      res.send (result);
    });

    app.patch('/orders/:id', async (req, res) => {
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const updatedOrder = req.body;
      console.log(updatedOrder);
      const updateDoc = {
        $set: {
          status: updatedOrder.status 
        },
      };
      const result = await ordersCollection.updateOne(filter, updateDoc);
      res.send(result);
    })

    app.delete('/orders/:id', async(req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await ordersCollection.deleteOne(query);
      res.send (result);
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("all food items is running");
});

app.listen(port, () => {
  console.log(`All Food Items Server is running on port ${port}`);
});
