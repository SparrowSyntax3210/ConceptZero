const app = require("./app/app");
const connectDB = require("./app/db/db");

const port = Number(process.env.PORT) || 3000;
const server = app.listen(port, "0.0.0.0", () => {
  console.log(`Server is listening on port ${port}`);
});

server.on("error", (error) => {
  console.error("Could not start the web server:", error.message);
  process.exitCode = 1;
});

async function connectWithRetry() {
  let delayMs = 5000;

  while (true) {
    try {
      await connectDB();
      return;
    } catch (error) {
      console.error("MongoDB is not ready yet:", error.message);
      console.log(`Retrying the database connection in ${delayMs / 1000}s.`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      delayMs = Math.min(delayMs * 2, 30000);
    }
  }
}

connectWithRetry();
