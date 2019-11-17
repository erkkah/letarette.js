import {EventEmitter} from "events";

import * as NATS from "nats";
import {IndexStatus} from "./protocol";

export class Monitor extends EventEmitter {
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
                reconnect: true,
                reconnectTimeWait: 500,
                maxReconnectAttempts: -1,
            });

            const connectionRejector = (err: any) => {
                reject(err);
            };

            this.client.once("error", connectionRejector);

            this.client.once("connect", (c: NATS.Client) => {
                c.off("error", connectionRejector);
                c.on("error", (err: any) => {
                    this.emit("error", err);
                });
                c.subscribe(this.topic + ".status", (status: IndexStatus) => {
                    this.emit("status", status);
                });
                resolve();
            });

            this.client.on("disconnect", () => {
                this.emit("disconnect");
            });
            this.client.on("reconnect", () => {
                this.emit("reconnect");
            });
        });
    }

    public close() {
        if (this.client) {
            this.client.close();
        }
    }
}
