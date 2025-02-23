import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { BadRequestException, ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import * as cookieParser from "cookie-parser";

async function start() {
  try {
    const PORT = process.env.PORT ?? 3003;
    const app = await NestFactory.create(AppModule);
    ``;
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe());
    app.setGlobalPrefix("api");
    app.enableCors({
      origin: (origin, callback) => {
        const allowedOrigins = [
          "http://localhost:8000",
          "http://localhost:3000",
          "http://muruvvat.uz",
          "http://api.muruvvat.uz",
          "http://muruvvat.vercal.app",
        ];
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new BadRequestException("Not allowed by CORS"));
        }
      },
      methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
      credentials: true,
    });

    const config = new DocumentBuilder()
      .addBearerAuth(
        {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter your Bearer token",
          name: "JWT",
          in: "header",
        },
        "authorization"
      )
      .setTitle("Cats example")
      .setDescription("The cats API description")
      .setVersion("1.0")
      .addTag("cats")
      .build();
    const documentFactory = () => SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("api", app, documentFactory);

    await app.listen(PORT, () => {
      console.log(`Server is runnning at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.log(error.message);
  }
}
start();
