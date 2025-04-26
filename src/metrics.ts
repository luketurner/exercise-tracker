"use strict";

import { Router } from "express";
import { register, Counter, Histogram, Gauge } from "prom-client";
import { countUsers } from "./models/user";

export const routeMetric = new Histogram({
  name: "count_routes_called",
  help: "Count of how many times a route was called",
  labelNames: ["url", "statusCode", "hasSession", "isError", "method"] as const,
});

export const usersMetric = new Gauge({
  name: "count_users",
  help: "Number of users",
  async collect() {
    // Invoked when the registry collects its metrics' values.
    const currentValue = await countUsers();
    this.set(currentValue);
  },
});

export const metricsRouter = Router();

metricsRouter.get("/metrics", async (req, res) => {
  try {
    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
  } catch (ex) {
    res.status(500).end(ex);
  }
});
