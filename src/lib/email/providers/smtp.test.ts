import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:net";
import { createInterface } from "node:readline";
import test from "node:test";
import { SmtpProvider, testSmtpConnection } from "./smtp";

test("SMTP can require STARTTLS while allowing plaintext by default", async (t) => {
  const host = "127.0.0.1";
  const server = createServer((socket) => {
    socket.write("220 localhost SMTP\r\n");
    createInterface({ input: socket }).on("line", (command) => {
      if (command.startsWith("EHLO")) {
        socket.write("250 localhost\r\n");
      } else if (command === "STARTTLS") {
        socket.write("454 STARTTLS unavailable\r\n");
      } else if (command === "QUIT") {
        socket.end("221 Goodbye\r\n");
      }
    });
  }).listen(0, host);
  t.after(() => new Promise<void>((resolve) => server.close(() => resolve())));
  await once(server, "listening");

  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const { port } = address;
  const config = { host, port, secure: false, requireTLS: true };

  const defaultVerification = await testSmtpConnection({
    host,
    port,
    secure: false,
  });
  assert.equal(defaultVerification.success, true);
  const verification = await testSmtpConnection(config);
  assert.equal(verification.success, false);
  assert.match(verification.error ?? "", /STARTTLS unavailable/);

  const env = {
    SMTP_HOST: host,
    SMTP_PORT: String(port),
    SMTP_SECURE: "false",
    SMTP_REQUIRE_TLS: "true",
    SMTP_USER: "",
  };
  for (const [key, value] of Object.entries(env)) {
    const previous = process.env[key];
    t.after(() => {
      if (previous === undefined) delete process.env[key];
      else process.env[key] = previous;
    });
    process.env[key] = value;
  }

  const provider = new SmtpProvider();
  const result = await provider.verify();
  assert.equal(result.success, false);
  assert.match(result.error ?? "", /STARTTLS unavailable/);
});
