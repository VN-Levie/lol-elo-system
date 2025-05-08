import { MongoClient } from 'mongodb';
import { MONGO_URI, DB_NAME } from '../config/constants.js'; 

let db = null;
let client = null;

async function connectDB() {
    if (db) return db;
    try {
        client = new MongoClient(MONGO_URI);
        await client.connect();
        db = client.db(DB_NAME);
        console.log("Successfully connected to MongoDB.");
        return db;
    } catch (error) {
        console.error("Could not connect to MongoDB", error);      
        process.exit(1);
    }
}

async function getDB() {
    if (!db) {
        await connectDB();
    }
    return db;
}

async function closeDB() {
    if (client) {
        await client.close();
        console.log("MongoDB connection closed.");
        client = null;
        db = null;
    }
}


export { getDB, connectDB, closeDB };