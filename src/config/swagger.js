import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "PlayUML API",
      version: "1.0.0",
      description: "API documentation for PlayUML backend",
    },
    servers: [
      {
        url: "http://localhost:5000",
      },
      {
        url: "https://playuml-backend.onrender.com",
      },
    ],
  },
  apis: ["./src/routes/*.js"], // where your route files are
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
