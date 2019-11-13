import * as NATS from "nats";

import { Monitor } from "./monitor";
import { IndexStatus, SearchRequest, SearchResponse } from "./protocol";

/**
 * A Letarette search cluster client.
 */
export class SearchClient {
    private client: NATS.Client | null = null;
    private readonly monitor: Monitor;
    private readonly url: string;
    private readonly topic: string;
    private numShards = 0;

    public constructor(url: string, topic: string = "leta", shardGroupSize?: number) {
        this.url = url;
        this.topic = topic;
        if (shardGroupSize) {
            this.numShards = shardGroupSize;
        }
        this.monitor = new Monitor(url, topic);
        this.monitor.on("status", (status: IndexStatus) => {
            this.numShards = status.ShardgroupSize;
        });
    }

    public async connect() {
        return new Promise((resolve, reject) => {
            this.client = NATS.connect({
                json: true,
                url: this.url,
                verbose: true,
            });
            this.client.on("connect", () => {
                if (this.numShards === 0) {
                    resolve(this.monitor.connect());
                } else {
                    resolve();
                }
            });
            this.client.on("error", (err) => {
                reject(err);
            });
        });
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

        const req: SearchRequest = {
            Query: query,
            Spaces: spaces,
            PageLimit: pageLimit,
            PageOffset: pageOffset,
        };

        const request = new Promise<SearchResponse[]>(async (resolve, reject) => {
            let subscription: number;

            const timeout = setTimeout(() => {
                this.client!.unsubscribe(subscription);
                reject("Timeout waiting for search response");
            }, 2000);

            const shards = await this.getNumShards();
            const inbox = this.client!.createInbox();
            const responses: SearchResponse[] = [];
            subscription = this.client!.subscribe(inbox, {max: shards}, (res: SearchResponse) => {
                responses.push(res);
                if (responses.length === shards) {
                    clearTimeout(timeout);
                    resolve(responses);
                }
            });
            this.client!.unsubscribe(subscription, shards);
            this.client!.publish(this.topic + ".q", req, inbox);
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
    }
    merged.Result.Hits = merged.Result.Hits.sort((a, b) => {
        return a.Rank - b.Rank;
    });

    return merged;
}
