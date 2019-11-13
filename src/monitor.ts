import * as events from "events";
import * as NATS from "nats";
import {IndexStatus} from "./protocol";

export class Monitor extends events.EventEmitter {
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
                verbose: true,
            });
            this.client.on("connect", (c: NATS.Client) => {
                c.subscribe(this.topic + ".status", (status: IndexStatus) => {
                    this.emit("status", status);
                });
                resolve();
            });
            this.client.on("error", (err) => {
                reject(err);
            });
        });
    }

    public close() {
        if (this.client) {
            this.client.close();
        }
    }
}
