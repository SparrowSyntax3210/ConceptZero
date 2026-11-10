const app = require("./app/app");
const connectDB = require("./app/db/db");

async function startServer() {
  try {
    await connectDB();
    app.listen(3000, () => {
      console.log("Server is running on port 3000");
    });
  } catch {
    process.exitCode = 1;
  }
}

startServer();
