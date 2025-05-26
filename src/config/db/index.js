import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()

async function connect() {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        })
        console.log('Connect to Database successfully!!!')
    } catch (err) {
        console.log('Connect failure!!!')
    }
}

export default { connect }
