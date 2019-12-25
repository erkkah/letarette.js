import {EventEmitter} from "events";

import {Client} from "ts-nats";

import {connect, NATSOptions} from "./natshelper";
import {DocumentRequest, DocumentUpdate, IndexUpdate, IndexUpdateRequest} from "./protocol";

// IndexRequestHandler processes index update requests from the letarette cluster
// and returns index updates.
export type IndexRequestHandler = (req: IndexUpdateRequest) => IndexUpdate;

// DocumentRequestHandler processes document requests from the letarette cluster
// and returns document updates.
export type DocumentRequestHandler = (req: DocumentRequest) => DocumentUpdate;

const MAX_PAYLOAD = 1000 * 1000;

// DocumentManager connects to the letarette cluster and processes indexing requests
export class DocumentManager extends EventEmitter {
    private client: Client | null = null;
    private readonly URLs: string[];
    private readonly options: NATSOptions;

    public constructor(URLs: string[], options: NATSOptions = {topic: "leta"}) {
        super();
        this.URLs = URLs;
        this.options = options;
    }

    public async connect() {
        this.client = await connect(this.URLs, this.options);
    }

    public close() {
        if (this.client) {
            this.client.close();
        }
    }

    public async startIndexRequestHandler(handler: IndexRequestHandler) {
        if (!this.client) {
            throw new Error("Must be connected");
        }

        return this.client.subscribe(
            this.options.topic + ".index.request",
            (err, msg) => {
                const req: IndexUpdateRequest = msg.data;
                const reply = msg.reply!;
                req.FromTime = new Date(req.FromTime);
                const update = handler(req);
                this.client!.publish(reply, update);
            },
        );
    }

    public async startDocumentRequestHandler(handler: DocumentRequestHandler) {
        if (!this.client) {
            throw new Error("Must be connected");
        }

        const handle = (req: DocumentRequest) => {
            const update = handler(req);
            const updates: DocumentUpdate[] = [update];

            while (updates.length > 0) {
                const current = updates.pop()!;
                const jsonMessage = JSON.stringify(current);
                const messageBuffer = Buffer.from(jsonMessage);

                // The server disconnects if the message is too large.
                // The 1024 is just to leave room for the protocol part.
                if (messageBuffer.length > (MAX_PAYLOAD - 1024)) {
                    const length = current.Documents.length;
                    if (length > 1) {
                        const mid = length / 2;
                        updates.push({
                            Space: current.Space,
                            Documents: current.Documents.slice(0, mid),
                        },
                        {
                            Space: current.Space,
                            Documents: current.Documents.slice(mid),
                        });
                        this.emit("warning", "Document list too large, splitting");
                    } else {
                        const doc = current.Documents[0];
                        doc.Text = truncateString(doc.Text, MAX_PAYLOAD / 2);
                        updates.push({
                            Space: current.Space,
                            Documents: [doc],
                        });
                        this.emit("warning", `Document ${doc.ID} too large, truncating`);
                    }
                } else {
                    this.client!.publish(this.options.topic + ".document.update", current);
                }
            }
        };

        return this.client.subscribe(this.options.topic + ".document.request",
            (err, msg) => {
                handle(msg.data);
            },
        );
    }
}

function truncateString(long: string, max: number): string {
    return long.slice(0, max) + "\u2026"; // ellipsis
}
