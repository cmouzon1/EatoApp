import React from "react";
import ReactDOM from "react-dom/client";

async function main() {
  const { ClerkProvider } = await import("@clerk/clerk-react");
  const { default: App } = await import("./App");
  await import("./index.css");

  const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <ClerkProvider publishableKey={clerkPubKey ?? ""}>
        <App />
      </ClerkProvider>
    </React.StrictMode>
  );
}

main();
