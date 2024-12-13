import { cborDecode, cborDecodeMulti } from "@atproto/common";
import { AppBskyFeedPost, ComAtprotoSyncSubscribeRepos } from "@atproto/api";
import { z } from "zod";
import { CarReader } from "@ipld/car/reader";

const socket = new WebSocket(
  "wss://bsky.network/xrpc/com.atproto.sync.subscribeRepos"
);

type Payload = ComAtprotoSyncSubscribeRepos.Commit & {
  ops?: ComAtprotoSyncSubscribeRepos.RepoOp[];
};

// message is received
socket.addEventListener("message", async (event) => {
  const [header, payload] = cborDecodeMulti(event.data) as [unknown, Payload];

  if (!isCommit(header)) {
    return;
  }

  const { ops, blocks } = payload;

  if (!Array.isArray(ops)) {
    return;
  }

  const [op] = ops;

  if (op?.action !== "create") {
    return;
  }

  const cr = await CarReader.fromBytes(blocks);
  const block = await cr.get(op.cid);

  if (!block?.bytes) {
    return;
  }

  const post = cborDecode(block.bytes) as AppBskyFeedPost.Record;

  console.log(post);
});

function isCommit(header: unknown) {
  const { t } = z
    .object({
      t: z.string(),
      op: z.number(),
    })
    .parse(header);

  return t === "#commit";
}
