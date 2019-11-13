import * as NATS from "nats";
import { SearchRequest, SearchResponse } from "./protocol";

export class SearchClient {
    private client: NATS.Client | null = null;
    private readonly url: string;
    private readonly topic: string;

    public constructor(url: string, topic: string = "leta") {
        this.url = url;
        this.topic = topic;
    }

    public connect(): Promise<SearchClient> {
        return new Promise<SearchClient>((resolve, reject) => {
            this.client = NATS.connect({
                json: true,
                url: this.url,
                verbose: true,
            });
            this.client.on("connect", () => {
                resolve(this);
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

        const numShards = 1;

        const req: SearchRequest = {
            Query: query,
            Spaces: spaces,
            PageLimit: pageLimit,
            PageOffset: pageOffset,
        };

        const request = new Promise<SearchResponse[]>((resolve, reject) => {
            let subscription: number;

            /*
            const timeout = setTimeout(() => {
                this.client!.unsubscribe(subscription);
                reject("Timeout waiting for search response");
            }, 2000);
            */

            const inbox = this.client!.createInbox();
            const responses: SearchResponse[] = [];
            subscription = this.client!.subscribe(inbox, {max: numShards}, (res: SearchResponse) => {
                responses.push(res);
                if (responses.length === numShards) {
                    // clearTimeout(timeout);
                    resolve(responses);
                }
            });
            this.client!.unsubscribe(subscription, numShards);
            this.client!.publish(this.topic + ".q", req, inbox);
        });

        const result = await request;

        return mergeResponses(result);
    }

    public close() {
        if (this.client) {
            this.client.close();
        }
    }
}

function mergeResponses(responses: SearchResponse[]): SearchResponse {
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
