import { createAuthClient } from "better-auth/client";
// import "@starfederation/datastar";
export const authClient = createAuthClient({
  baseURL: "http://localhost:3000", // the base url of your auth server
});

export async function signUp(name, email, password) {
  console.log(name, email, password);
  const { data, error } = await authClient.signUp.email(
    {
      email,
      password,
      name,
      // image: image ? convertImageToBase64(image) : undefined,
    },
    {
      onRequest: (ctx) => {},
      onSuccess: (ctx) => {
        alert("Success");
      },
      onError: (ctx) => {
        alert(ctx.error.message);
      },
    }
  );
}

window.exerciseTracker = { signUp };
