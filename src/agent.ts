import { EventEmitter } from "events";

import { Client, Subscription } from "ts-nats";

import { Monitor } from "./monitor";
import { connect, NATSOptions } from "./natshelper";
import { IndexStatus, SearchRequest, SearchResponse } from "./protocol";

// A Letarette Search Agent
export class SearchAgent extends EventEmitter {
    private client: Client | null = null;
    private readonly monitor: Monitor;
    private readonly URLs: string[];
    private readonly options: NATSOptions;
    private numShards = 0;

    public constructor(URLs: string[], options: NATSOptions = {topic: "leta"}) {
        super();
        this.URLs = URLs;
        this.options = options;
        this.monitor = new Monitor(URLs, options);
        this.monitor.on("status", (status: IndexStatus) => {
            this.numShards = status.ShardgroupSize;
        });
    }

    public async connect() {
        this.client = await connect(this.URLs, this.options);

        if (this.numShards === 0) {
            await this.monitor.connect();
        }
    }

    public async search(
        query: string,
        spaces: string[],
        pageLimit: number,
        pageOffset: number,
    ): Promise<SearchResponse> {

        if (this.client === null) {
            throw new Error("Must be connected");
        }

        const numShards = await this.getNumShards();
        const shardedLimit = Math.max(1, Math.trunc(pageLimit / numShards));

        const req: SearchRequest = {
            Query: query,
            Spaces: spaces,
            PageLimit: shardedLimit,
            PageOffset: pageOffset,
            Autocorrect: false,
        };

        const request = new Promise<SearchResponse[]>(async (resolve, reject) => {
            let subscription: Subscription;

            const timeout = setTimeout(() => {
                if (subscription) {
                    subscription.unsubscribe();
                }
                reject("Timeout waiting for search response");
            }, 2000);

            const inbox = this.client!.createInbox();
            const responses: SearchResponse[] = [];
            subscription = await this.client!.subscribe(inbox, (err, msg) => {
                if (err) {
                    reject(err);
                }
                const res: SearchResponse = msg.data;
                responses.push(res);
                if (responses.length === numShards) {
                    clearTimeout(timeout);
                    resolve(responses);
                }
            }, {max: numShards});
            subscription.unsubscribe(numShards);
            this.client!.publish(this.options.topic + ".q", req, inbox);
        });

        const result = await request;

        return mergeResponses(result);
    }

    public close() {
        if (this.client) {
            this.client.close();
        }
        this.monitor.close();
    }

    private async getNumShards(): Promise<number> {
        if (this.numShards !== 0) {
            return this.numShards;
        }
        return new Promise<number>((resolve, reject) => {
            const interval = setInterval(() => {
                if (this.numShards !== 0) {
                    clearInterval(interval);
                    resolve(this.numShards);
                }
            }, 100);
        });
    }
}

export function mergeResponses(responses: SearchResponse[]): SearchResponse {
    const merged: SearchResponse = {
        Result: {
            Hits: [],
            Capped: false,
            TotalHits: 0,
            Respelt: "",
            RespeltDistance: 0.0,
        },
        Status: 0,
        Duration: 0,
    };

    for (const response of responses) {
        if (merged.Duration < response.Duration) {
            merged.Duration = response.Duration;
        }
        if (merged.Status < response.Status) {
            merged.Status = response.Status;
        }
        merged.Result.Capped = merged.Result.Capped || response.Result.Capped;
        merged.Result.TotalHits += response.Result.TotalHits;
        if (response.Result.Hits) {
            merged.Result.Hits.push(...response.Result.Hits);
        }
        if (merged.Result.Respelt === "" ||
            (response.Result.RespeltDistance > 0 && merged.Result.RespeltDistance > response.Result.RespeltDistance)) {
            merged.Result.Respelt = response.Result.Respelt;
            merged.Result.RespeltDistance = response.Result.RespeltDistance;
        }
    }
    merged.Result.Hits = merged.Result.Hits.sort((a, b) => {
        return a.Rank - b.Rank;
    });

    return merged;
}
