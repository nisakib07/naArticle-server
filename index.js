const express = require("express");
const cors = require("cors");
require("dotenv").config();
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const app = express();
const port = process.env.PORT || 5000;

app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@newsportal.ctkw5q7.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // await client.connect();
    const articleCollection = client
      .db("allInformation")
      .collection("articleCollection");
    const publisherCollection = client
      .db("allInformation")
      .collection("publisherCollection");
    const userCollection = client
      .db("allInformation")
      .collection("userCollection");

    //   article related api

    app.get("/articles", async (req, res) => {
      const result = await articleCollection.find().toArray();
      res.send(result);
    });

    app.get("/articles/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await articleCollection.findOne(query);
      res.send(result);
    });

    app.post("/articles", async (req, res) => {
      const article = req.body;
      const result = await articleCollection.insertOne(article);
      res.send(result);
    });

    app.patch("/articles/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          status: "Approved",
        },
      };

      const result = await articleCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    app.patch("/articles/increase-view/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedView = {
        $inc: {
          views: 1,
        },
      };
      const result = await articleCollection.updateOne(filter, updatedView);
      res.send(result);
    });

    app.patch("/articles/premium/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          isPremium: true,
        },
      };

      const result = await articleCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    app.delete("/articles/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await articleCollection.deleteOne(filter);
      res.send(result);
    });

    app.put("/articles/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const body = req.body;
      const updatedArticle = {
        $set: {
          ...body,
        },
      };
      const options = { upsert: true };
      const result = await articleCollection.updateOne(
        filter,
        updatedArticle,
        options
      );
      res.send(result);
    });

    app.get("/articles/searchPublisher/:publisher", async (req, res) => {
      const publisher = req.params.publisher;
      const filter = { publisher: publisher };
      const result = await articleCollection.find(filter).toArray();
      res.send(result);
    });
    app.get("/articles/searchTitle/:title", async (req, res) => {
      const title = req.params.title;
      const filter = { title: { $regex: new RegExp(title, "i") } };
      const result = await articleCollection.find(filter).toArray();
      res.send(result);
    });

    app.get("/articles/searchTags/tags", async (req, res) => {
      const tags = req.query.tags; // Assuming tags are passed as query parameters
      const filter = { tags: { $elemMatch: { $in: tags } } };
      const result = await articleCollection.find(filter).toArray();
      res.send(result);
    });

    // publisher related api

    app.get("/publishers", async (req, res) => {
      const result = await publisherCollection.find().toArray();
      res.send(result);
    });

    app.post("/publishers", async (req, res) => {
      const publisher = req.body;
      const result = await publisherCollection.insertOne(publisher);
      res.send(result);
    });

    // user Related APi

    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return;
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.get("/users", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;

      const query = { email: email };
      const user = await userCollection.findOne(query);
      let isAdmin = false;
      if (user) {
        isAdmin = user.role == "admin";
      }

      res.send({ isAdmin });
    });

    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;

      const filter = { email: email };
      const user = await userCollection.findOne(filter);

      res.send(user);
    });

    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: "admin",
        },
      };

      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    app.put("/users/email", async (req, res) => {
      let query = {};
      if (req.query?.email) {
        query = { email: req.query?.email };
      }
      const body = req.body;
      const updatedDoc = {
        $set: {
          ...body,
        },
      };
      console.log(query);
      const options = { upsert: true };
      const result = await userCollection.updateOne(query, updatedDoc, options);
      res.send(result);
    });

    // payment intent

    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      //   console.log(amount, "amount inside the intent");

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

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
  res.send("Crud is running...");
});

app.listen(port, () => {
  console.log(`Simple Crud is Running on port ${port}`);
});
