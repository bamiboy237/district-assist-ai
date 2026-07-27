import app from "./app.js";

const PORT = process.env.PORT ?? 3000;

const server = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

process.on("SIGTERM", () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
