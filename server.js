const app = require('./app');
const dotenv = require('dotenv');
dotenv.config({ path: './config.env' });
const mongoose = require('mongoose');

const DB = process.env.DATABASE;

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('DB connection successful!!!!');
  })
  .catch((err) => console.log('Error💥:', err.message));

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`App listening on port ${port}....`);
});
