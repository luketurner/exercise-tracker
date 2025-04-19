import { createAuthClient } from "better-auth/client";
import Chart from "chart.js/auto";
import "chartjs-adapter-luxon";
import Sortable from "sortablejs";
import Alpine from "alpinejs";

window.Alpine = Alpine;

Alpine.store("error", {
  hasError: false,
  message: null,
});

Alpine.magic(
  "fetch",
  (el, { Alpine }) =>
    async function setFetch(method, url, body) {
      try {
        const resp = await fetch(url, {
          method,
          headers: {
            "content-type": "application/json",
          },
          body: body
            ? typeof body === "string"
              ? body
              : JSON.stringify(body)
            : undefined,
        });

        if (!resp.ok) {
          let errorMessage = "An unknown error has occurred.";
          try {
            const errorResp = await resp.json();
            errorMessage = errorResp.errorMessage;
          } catch (e) {}
          throw new Error(errorMessage.toString());
        }

        return await resp.json();
      } catch (e) {
        console.error("error", e.message);
        Alpine.evaluate(
          document.body,
          `$store.error = { hasError: true, message: ${JSON.stringify(
            e.message
          )} }`
        );
      }
    }
);

Alpine.start();

export const authClient = createAuthClient({
  baseURL: PROD ? "https://set.luketurner.org" : "http://localhost:3000", // the base url of your auth server
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
              return paramValue?.value ?? paramValue?.minutes;
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

export function makeSortable(id, onEnd) {
  return new Sortable(document.getElementById(id), {
    animation: 150,
    handle: ".handle",
    ghostClass: "blue-background-class",
    async onEnd(evt, originalEvent) {
      const id = evt.item.getAttribute("data-id");
      if (evt.newIndex === evt.oldIndex) {
        return;
      }
      try {
        return await onEnd(id, evt.newIndex, evt.oldIndex);
      } catch (e) {
        // TODO -- toast?
        window.location.reload();
      }
    },
  });
}

export function makeSortableSetList(id) {
  return makeSortable(id, async function (id, newIndex, oldIndex) {
    const resp = await fetch("/sets/" + id + "/move", {
      method: "POST",
      body: new URLSearchParams({
        newOrder: newIndex + 1,
        oldOrder: oldIndex + 1,
      }),
    });
    if (resp.status !== 200) {
      throw new Error("Could not move set");
    }
  });
}

export async function setFetch(method, url, body) {
  try {
    const resp = await fetch(url, {
      method,
      headers: {
        "content-type": "application/json",
      },
      body: body
        ? typeof body === "string"
          ? body
          : JSON.stringify(body)
        : undefined,
    });

    if (!resp.ok) {
      let errorMessage = "An unknown error has occurred.";
      try {
        const errorResp = await resp.json();
        errorMessage = errorResp.errorMessage;
      } catch (e) {}
      throw new Error(errorMessage.toString());
    }

    return await resp.json();
  } catch (e) {
    console.log("error", e.message);
    Alpine.evaluate(
      document.body,
      "$store.error = { hasError: true, message: e.message }",
      { e }
    );
  }
}

window._set = {
  signIn,
  signOut,
  buildChart,
  makeSortable,
  makeSortableSetList,
  fetch: setFetch,
};
