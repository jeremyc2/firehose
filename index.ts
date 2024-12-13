import { decodeMultiple } from "cbor-x";
import { z } from "zod";

const socket = new WebSocket(
  "wss://bsky.network/xrpc/com.atproto.sync.subscribeRepos"
);

// message is received
socket.addEventListener("message", (event) => {
  const [short, long] = decodeMultiple(event.data) as unknown as [
    unknown,
    unknown
  ];

  if (!isCommit(short)) {
    return;
  }

  try {
    handleLong(long);
  } catch (error) {
    console.error(long);
    throw error;
  }
});

function isCommit(short: unknown) {
  const { t } = z
    .object({
      t: z.string(),
      op: z.number(),
    })
    .parse(short);

  return t === "#commit";
}

function handleLong(long: unknown) {
  const { ops } = z
    .object({
      ops: z.array(
        z.object({
          path: z.string(),
          action: z.string(),
        })
      ),
    })
    .parse(long);

  ops.forEach((op) => {
    if (op.action === "create") {
      console.log(`CREATE: ${op.path}`);
    }
  });
}
