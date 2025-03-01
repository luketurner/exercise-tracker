import { createAuthClient } from "better-auth/client";
import Chart from "chart.js/auto";
import "chartjs-adapter-luxon";

// import "@starfederation/datastar";
export const authClient = createAuthClient({
  baseURL: "http://localhost:3000", // the base url of your auth server
});

export async function signIn() {
  await authClient.signIn.social({
    provider: "github",
    callbackURL: "/today",
  });
}

export async function signOut() {
  try {
    await authClient.signOut();
    console.log("Signed out successfully");
    window.location.pathname = "/";
  } catch (error) {
    console.error("Error signing out:", error);
  }
}

export async function buildChart(exercise, sets) {
  for (const param of exercise.parameters) {
    new Chart(document.getElementById(`chart-${param.id}`), {
      type: "line",
      data: {
        labels: sets.map((set) => set.date),
        datasets: [
          {
            label: param.name,
            data: sets.map((set) => {
              const paramValue = set.parameters[param.id];
              return paramValue?.value ?? paramValue?.minutes ?? paramValue;
            }),
          },
        ],
      },
      options: {
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          y:
            param.dataType === "intensity"
              ? {
                  type: "category",
                  labels: ["high", "medium", "low"],
                }
              : {
                  type: "linear",
                },
          x: {
            type: "time",
          },
        },
      },
    });
  }
}

window.exerciseTracker = { signIn, signOut, buildChart };
