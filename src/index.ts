import { metricsRouter } from "./metrics";
import { router } from "./router";
import express from "express";

const app = express();
const port = 3000;
app.set("view engine", "pug");

app.use(router);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

const metricsApp = express();
const metricsPort = 3001;
metricsApp.use(metricsRouter);
metricsApp.listen(metricsPort, () => {
  console.log(`Prometheus metrics listening on port ${metricsPort}`);
});
