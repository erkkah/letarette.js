import {EventEmitter} from "events";

import {Client, connect, Payload} from "ts-nats";
import {IndexStatus} from "./protocol";

// Monitor listens to status broadcasts from a letarette cluster
export class Monitor extends EventEmitter {
    private client: Client | null = null;
    private url: string;
    private topic: string;

    public constructor(url: string, topic: string = "leta") {
        super();
        this.url = url;
        this.topic = topic;
    }

    public async connect() {
        this.client = await connect({
            payload: Payload.JSON,
            url: this.url,
            reconnect: true,
            reconnectTimeWait: 500,
            maxReconnectAttempts: -1,
        });

        this.client.subscribe(this.topic + ".status", (err, msg) => {
            const status: IndexStatus = msg.data;
            this.emit("status", status);
        });
    }

    public close() {
        if (this.client) {
            this.client.close();
        }
    }
}
