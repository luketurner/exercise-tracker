import { createAuthClient } from "better-auth/client";
import Chart from "chart.js/auto";

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
            data: sets.map((set) => set.parameters[param.id]),
          },
        ],
      },
      options: {
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
        },
      },
    });
  }
}

window.exerciseTracker = { signIn, signOut, buildChart };
