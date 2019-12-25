import { readFile } from "fs";
import { promisify } from "util";

import {Client, connect as natsConnect, NatsConnectionOptions, Payload, ServerInfo} from "ts-nats";

export interface NATSOptions {
    topic: string;
    shardGroupSize?: number;
    seedFile?: string;
    rootCAs?: string[];
}

export async function connect(URLs: string[], options: NATSOptions): Promise<Client> {
    const connectionOptions: NatsConnectionOptions = {
        payload: Payload.JSON,
        servers: URLs,
        reconnect: true,
        reconnectTimeWait: 500,
        maxReconnectAttempts: -1,
    };

    if (options.seedFile) {
        connectionOptions.nkeyCreds = options.seedFile;
    }

    if (options.rootCAs) {
        const loadedCAs = await Promise.all(options.rootCAs.map((path) => promisify(readFile)(path)));
        connectionOptions.tls = {
            ca: loadedCAs,
        };
    }

    const client = await natsConnect(connectionOptions);
    client.on("connect", (c: Client, URL: string, serverInfo: ServerInfo) => {
        const cAsAny = c as any;
        cAsAny.maxPayload = serverInfo.max_payload;
    });
    return client;
}

export function getMaxPayload(client: Client) {
    const cAsAny = client as any;
    return cAsAny.maxPayload || 0;
}
