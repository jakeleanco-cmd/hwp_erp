const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const Question = require('./models/Question');

async function check() {
  try {
    console.log('Connecting to DB:', process.env.MONGODB_URI);
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hwp_math_erp');
    console.log('DB connected.');
    const questions = await Question.find({ content: /<img/ }).limit(1);
    if (questions.length === 0) {
      console.log('No questions with images found.');
      // Find any question
      const anyQ = await Question.findOne();
      console.log('Any question found:', anyQ ? anyQ._id : 'None');
      if (anyQ) console.log('Content:', anyQ.content);
    } else {
      const q = questions[0];
      console.log(`ID: ${q._id}`);
      console.log(`FULL CONTENT: ${q.content}`);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

check();
