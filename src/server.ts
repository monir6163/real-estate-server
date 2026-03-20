import { Server } from "http";
import app from "./app";
import { prisma } from "./app/lib/prisma";
import { envConfig } from "./config/env";

process.on("uncaughtException", (error) => {
  console.log(error);
  process.exit(1);
});

let server: Server;

async function bootstrap() {
  try {
    await prisma.$connect();
    console.log("DB is connected succesfully ....!!");
    server = app.listen(envConfig.PORT, () => {
      console.log(`Application is listening on port ${envConfig.PORT}`);
    });
  } catch (err) {
    console.log("server connection error", err);
  }
  process.on("unhandledRejection", (error) => {
    if (server) {
      server.close(() => {
        console.log(error);
        process.exit(1);
      });
    } else {
      process.exit(1);
    }
  });
}
bootstrap();
