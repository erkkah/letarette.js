import { SearchClient } from "./client";
import { SearchResponse, searchStatusCodeToString } from "./protocol";

const searchClient = new SearchClient("nats://localhost:4222");

(async () => {
    try {
        await searchClient.connect();
        const result = await searchClient.search("cat", ["wp"], 10, 0);
        showResponse(result);
    } catch (err) {
        console.log(err);
    } finally {
        searchClient.close();
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
