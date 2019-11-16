import { createInterface } from "readline";

import {
    SearchClient,
    SearchResponse,
    searchStatusCodeToString,
} from "letarette";

const searchClient = new SearchClient("nats://localhost:4222");

(async () => {
    try {
        await searchClient.connect();
        const term = createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: "search>",
        });
        term.prompt();

        term.on("line", async (line) => {
            searchClient.search(line, ["docs"], 10, 0)
            .then((result) => {
                showResponse(result);
            })
            .catch((err) => {
                console.log(err);
            })
            .finally(() => {
                term.prompt();
            });
        });

        term.on("close", () => {
            searchClient.close();
            process.exit(0);
        });

    } catch (err) {
        console.log(err);
    }
})();

function showResponse(response: SearchResponse) {
    const duration = response.Duration;
    const status = searchStatusCodeToString(response.Status);
    console.log(`Query executed in ${duration} seconds with status "${status}"`);
    const result = response.Result;
    const numHits = result.Hits.length;
    const totalHits = result.TotalHits;
    const capped = result.Capped;
    console.log(`Returning ${numHits} of ${totalHits} total hits, capped: ${capped}\n`);

    for (const hit of result.Hits) {
        console.log(`[${hit.ID}] ${hit.Snippet}`);
    }
}
