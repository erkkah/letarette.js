import {EventEmitter} from "events";

import * as NATS from "nats";
import {DocumentRequest, DocumentUpdate, IndexUpdate, IndexUpdateRequest} from "./protocol";

export type IndexRequestHandler = (req: IndexUpdateRequest) => IndexUpdate;
export type DocumentRequestHandler = (req: DocumentRequest) => DocumentUpdate;

const MAX_PAYLOAD = 1000 * 1000;

export class DocumentManager extends EventEmitter {
    private client: NATS.Client | null = null;
    private url: string;
    private topic: string;

    public constructor(url: string, topic: string = "leta") {
        super();
        this.url = url;
        this.topic = topic;
    }

    public async connect() {
        return new Promise((resolve, reject) => {
            this.client = NATS.connect({
                json: true,
                url: this.url,
                reconnectTimeWait: 250,
            });

            const connectionRejector = (err: any) => {
                reject(err);
            };

            this.client.once("error", connectionRejector);

            this.client.once("connect", async (c: NATS.Client) => {
                c.off("error", connectionRejector);
                c.on("error", (err) => {
                    this.emit("error", err);
                });
                resolve();
            });
        });
    }

    public close() {
        if (this.client) {
            this.client.close();
        }
    }

    public startIndexRequestHandler(handler: IndexRequestHandler) {
        if (!this.client) {
            throw new Error("Must be connected");
        }

        this.client.subscribe(
            this.topic + ".index.request",
            (req: IndexUpdateRequest, reply: string) => {
                const update = handler(req);
                this.client!.publish(reply, update);
            },
        );
    }

    public startDocumentRequestHandler(handler: DocumentRequestHandler) {
        if (!this.client) {
            throw new Error("Must be connected");
        }

        this.client.subscribe(
            this.topic + ".document.request",
            (req: DocumentRequest) => {
                const update = handler(req);
                const updates: DocumentUpdate[] = [update];

                while (updates.length > 0) {
                    const current = updates.pop()!;
                    const jsonMessage = JSON.stringify(current);
                    const messageBuffer = new Buffer(jsonMessage);

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
                        this.client!.publish(this.topic + ".document.update", messageBuffer, (err: any) =>  {
                            this.emit(err);
                        });
                    }
                }
            },
        );
    }
}

function truncateString(long: string, max: number): string {
    return long.slice(0, max) + "\u2026"; // ellipsis
}
