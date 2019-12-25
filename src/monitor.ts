import {EventEmitter} from "events";

import {Client} from "ts-nats";

import {connect, NATSOptions} from "./natshelper";
import {IndexStatus} from "./protocol";

// Monitor listens to status broadcasts from a letarette cluster
export class Monitor extends EventEmitter {
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
        this.client.subscribe(this.options.topic + ".status", (err, msg) => {
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
