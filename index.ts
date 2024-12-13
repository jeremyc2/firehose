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

  const post = await getPost(payload);

  if (!post) {
    return;
  }

  console.log(post.text);
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

async function getPost(payload: Payload) {
  const { ops, blocks } = payload;

  if (!Array.isArray(ops)) {
    return;
  }

  const [op] = ops;

  if (op?.action !== "create" || !op?.path.startsWith("app.bsky.feed.post/")) {
    return;
  }

  const cr = await CarReader.fromBytes(blocks);
  const block = await cr.get(op.cid);

  if (!block?.bytes) {
    return;
  }

  const post = cborDecode(block.bytes) as AppBskyFeedPost.Record;

  return post;
}
